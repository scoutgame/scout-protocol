import {
  decodeContributionReceiptAttestation,
  encodeContributionReceiptAttestation,
  contributionSchemaDefinition,
  NULL_EAS_REF_UID,
  NULL_EVM_ADDRESS
} from '@charmverse/core/protocol';
import type { ContributionReceiptAttestation } from '@charmverse/core/protocol';
import { viem } from 'hardhat';
import { parseEventLogs } from 'viem';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export async function deployEASContracts() {
  const { adminAccount: admin, userAccount: attester } = await generateWallets();

  const EASSchemaRegistryContract = await viem.deployContract('SchemaRegistry', []);

  const EASAttestationContract = await viem.deployContract('EAS', [EASSchemaRegistryContract.address], {
    client: { wallet: admin }
  });

  const ProtocolEASResolverContract = await viem.deployContract(
    'ProtocolEASResolver',
    [EASAttestationContract.address, attester.account.address],
    {
      client: { wallet: admin }
    }
  );

  const contributionReceiptSchemaTx = await EASSchemaRegistryContract.write.register(
    [contributionSchemaDefinition.schema, ProtocolEASResolverContract.address, true],
    {
      account: attester.account
    }
  );

  const receipt = await attester.getTransactionReceipt({ hash: contributionReceiptSchemaTx });

  const parsedLogs = parseEventLogs({
    abi: EASSchemaRegistryContract.abi,
    logs: receipt.logs,
    eventName: ['Registered']
  });

  const contributionReceiptSchemaId = parsedLogs[0].args.uid;

  async function attestContributionReceipt({
    data,
    wallet
  }: {
    data: ContributionReceiptAttestation;
    wallet?: GeneratedWallet;
  }): Promise<`0x${string}`> {
    const attestArgs: Parameters<typeof EASAttestationContract.write.attest>[0] = [
      {
        schema: contributionReceiptSchemaId,
        data: {
          value: BigInt(0),
          revocable: true,
          recipient: NULL_EVM_ADDRESS,
          refUID: NULL_EAS_REF_UID,
          expirationTime: BigInt(0),
          data: encodeContributionReceiptAttestation(data)
        }
      }
    ];

    const attestationTx = await EASAttestationContract.write.attest(attestArgs, {
      account: wallet?.account ?? attester.account
    });

    const _receipt = await attester.getTransactionReceipt({ hash: attestationTx });

    const _parsedLogs = parseEventLogs({
      abi: EASAttestationContract.abi,
      logs: _receipt.logs,
      eventName: ['Attested']
    });

    const attestationUid = _parsedLogs[0].args.uid;

    return attestationUid;
  }

  async function getContributionReceipt(attestationUid: string): Promise<ContributionReceiptAttestation> {
    const onchainAttestationData = await EASAttestationContract.read.getAttestation([attestationUid as `0x${string}`]);

    const decodedData = decodeContributionReceiptAttestation(onchainAttestationData.data);

    return decodedData;
  }

  return {
    EASSchemaRegistryContract,
    EASAttestationContract,
    ProtocolEASResolverContract,
    easResolverAdminWallet: admin,
    attester,
    contributionReceiptSchemaId,
    attestContributionReceipt,
    getContributionReceipt
  };
}

export type EASTestFixture = Awaited<ReturnType<typeof deployEASContracts>>;
