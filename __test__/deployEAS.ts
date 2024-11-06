import { viem } from 'hardhat';
import { parseEventLogs } from 'viem';

import { NULL_ADDRESS } from '../lib/constants';
import type { BuilderEventAttestation } from '../lib/eas';
import {
  builderEventEASSchema,
  decodeBuilderEventAttestation,
  encodeBuilderEventAttestation,
  NULL_EAS_REF_UID
} from '../lib/eas';

import { generateWallets } from './generateWallets';

export async function deployEASContracts() {
  const { adminAccount: admin, userAccount: attesterWallet } = await generateWallets();

  const EASSchemaRegistryContract = await viem.deployContract('SchemaRegistry', []);

  const EASAttestationContract = await viem.deployContract('EAS', [EASSchemaRegistryContract.address], {
    client: { wallet: admin }
  });

  const ProtocolEASResolverContract = await viem.deployContract(
    'ProtocolEASResolver',
    [EASAttestationContract.address, attesterWallet.account.address],
    {
      client: { wallet: admin }
    }
  );

  const contributionReceiptSchemaTx = await EASSchemaRegistryContract.write.register(
    [builderEventEASSchema, ProtocolEASResolverContract.address, true],
    {
      account: attesterWallet.account
    }
  );

  const receipt = await attesterWallet.getTransactionReceipt({ hash: contributionReceiptSchemaTx });

  const parsedLogs = parseEventLogs({
    abi: EASSchemaRegistryContract.abi,
    logs: receipt.logs,
    eventName: ['Registered']
  });

  const contributionReceiptSchemaId = parsedLogs[0].args.uid;

  async function attestContributionReceipt({ data }: { data: BuilderEventAttestation }): Promise<string> {
    const attestArgs: Parameters<typeof EASAttestationContract.write.attest>[0] = [
      {
        schema: contributionReceiptSchemaId,
        data: {
          value: BigInt(0),
          revocable: true,
          recipient: NULL_ADDRESS,
          refUID: NULL_EAS_REF_UID,
          expirationTime: BigInt(0),
          data: encodeBuilderEventAttestation(data)
        }
      }
    ];

    const attestationTx = await EASAttestationContract.write.attest(attestArgs, { account: attesterWallet.account });

    const _receipt = await attesterWallet.getTransactionReceipt({ hash: attestationTx });

    const _parsedLogs = parseEventLogs({
      abi: EASAttestationContract.abi,
      logs: _receipt.logs,
      eventName: ['Attested']
    });

    const attestationUid = _parsedLogs[0].args.uid;

    return attestationUid;
  }

  async function getContributionReceipt(attestationUid: string): Promise<BuilderEventAttestation> {
    const onchainAttestationData = await EASAttestationContract.read.getAttestation([attestationUid as `0x${string}`]);

    const decodedData = decodeBuilderEventAttestation(onchainAttestationData.data);

    return decodedData;
  }

  return {
    EASSchemaRegistryContract,
    EASAttestationContract,
    ProtocolEASResolverContract,
    easResolverAdminWallet: admin,
    attesterWallet,
    contributionReceiptSchemaId,
    attestContributionReceipt,
    getContributionReceipt
  };
}

export type EASTestFixture = Awaited<ReturnType<typeof deployEASContracts>>;
