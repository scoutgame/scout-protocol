import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { viem } from 'hardhat';
import { parseEventLogs } from 'viem';

import { NULL_EAS_REF_UID, NULL_EVM_ADDRESS } from '../lib/constants';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export type EASSchema = {
  schema: string;
  name: string;
};

const contributionReceiptEASSchema = 'string description,string url,string metadataUrl,uint256 value,string type';

const contributionReceiptSchemaName = 'Scout Game Contribution Receipt';

export const contributionSchemaDefinition: EASSchema = {
  schema: contributionReceiptEASSchema,
  name: contributionReceiptSchemaName
};

export type ContributionReceiptAttestation = {
  description: string;
  url: string;
  metadataUrl: string;
  value: number;
  type: string;
};

const encoder = new SchemaEncoder(contributionReceiptEASSchema);

export function encodeContributionReceiptAttestation(attestation: ContributionReceiptAttestation): `0x${string}` {
  const encodedData = encoder.encodeData([
    { name: 'description', type: 'string', value: attestation.description },
    {
      name: 'url',
      type: 'string',
      value: attestation.url
    },
    {
      name: 'metadataUrl',
      type: 'string',
      value: attestation.metadataUrl
    },
    { name: 'value', type: 'uint256', value: attestation.value },
    { name: 'type', type: 'string', value: attestation.type }
  ]);

  return encodedData as `0x${string}`;
}

export function decodeContributionReceiptAttestation(rawData: string): ContributionReceiptAttestation {
  const parsed = encoder.decodeData(rawData);
  const values = parsed.reduce((acc, item) => {
    const key = item.name as keyof ContributionReceiptAttestation;

    if (key === 'value') {
      acc[key] = parseInt(item.value.value as string);
    } else {
      acc[key] = item.value.value as string;
    }
    return acc;
  }, {} as ContributionReceiptAttestation);

  return values as ContributionReceiptAttestation;
}

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
    getContributionReceipt,
    contributionSchemaDefinition
  };
}

export type EASTestFixture = Awaited<ReturnType<typeof deployEASContracts>>;
