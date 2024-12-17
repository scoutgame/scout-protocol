import { execSync } from 'node:child_process';

import {
  allSchemas,
  encodeNameSchemaAttestation,
  NAME_SCHEMA_UID,
  NULL_EAS_REF_UID,
  NULL_EVM_ADDRESS
} from '@charmverse/core/protocol';
import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import type { Address } from 'viem';
import { createWalletClient, http, isAddress, parseEventLogs, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import type { SupportedChains } from '../../lib/connectors';
import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey, getEasUrl } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployEASSchemas', 'Deploys or updates the EAS Resolver and scoutgame attestation schemas').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    await hre.run('compile');

    const viem = hre.viem;

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: connector.chain,
      transport: http(connector.rpcUrl)
    }).extend(publicActions);

    console.log('Using account:', account.address, 'on chain:', connector.chain.name);

    if (!isAddress(connector.easAttestationContract as string)) {
      throw new Error(`No EAS Contract found for chain ${connector.chain.name}:${connector.chain.id}`);
    }

    const easContract = await viem.getContractAt('IEAS', connector.easAttestationContract as `0x${string}`);

    const easSchemaRegistryAddress = await easContract.read.getSchemaRegistry();

    const easRegistryContract = await viem.getContractAt('ISchemaRegistry', easSchemaRegistryAddress as Address);

    console.log('Deploying the resolver contract...');

    const deployArgs = [connector.easAttestationContract as Address, account.address] as [Address, Address];

    const deployedResolver = await viem.deployContract('ProtocolEASResolver', deployArgs, {
      client: {
        wallet: walletClient
      }
    });

    const resolverAddress = deployedResolver.address;

    console.log('Resolver contract deployed at:', deployedResolver.address);

    console.log('Verifying implementation with etherscan');
    try {
      execSync(
        `npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${resolverAddress} ${deployArgs.join(' ')}`
      );
    } catch (err) {
      console.warn('Error verifying contract', err);
    }

    for (const { schema, name } of allSchemas) {
      const registerTx = await easRegistryContract.write.register([schema, resolverAddress, true], {
        account
      });

      const registerReceipt = await walletClient.waitForTransactionReceipt({ hash: registerTx });

      const logs = parseEventLogs({
        abi: easRegistryContract.abi,
        logs: registerReceipt.logs,
        eventName: ['Registered']
      });

      const schemaId = logs[0].args.schema.uid;

      console.log(`Schema "${name}" registered with UID: ${schemaId}`);

      const data = encodeNameSchemaAttestation({ name, schemaId });

      const namingTx = await easContract.write.attest(
        [
          {
            schema: NAME_SCHEMA_UID,
            data: {
              value: BigInt(0),
              revocable: true,
              recipient: NULL_EVM_ADDRESS,
              expirationTime: BigInt(0),
              refUID: NULL_EAS_REF_UID,
              data
            }
          }
        ],
        {
          account
        }
      );

      await walletClient.waitForTransactionReceipt({ hash: namingTx });
    }

    console.log('EAS Schemas deployed, view them on EAS');
    console.log(getEasUrl({ chain: hre.hardhatArguments.network as SupportedChains, type: 'schemas_list' }));
  }
);

module.exports = {};
