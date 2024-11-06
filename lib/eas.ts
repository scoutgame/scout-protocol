import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';

export const contributionReceiptEASSchema =
  'string userRefUID,string description,string url,string metadataUrl,uint256 value,string type';

export type ContributionReceiptAttestation = {
  userRefUID: string;
  description: string;
  url: string;
  metadataUrl: string;
  value: number;
  type: string;
};

const encoder = new SchemaEncoder(contributionReceiptEASSchema);

export const NULL_EAS_REF_UID = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function encodeContributionReceiptAttestation(attestation: ContributionReceiptAttestation): `0x${string}` {
  const encodedData = encoder.encodeData([
    { name: 'userRefUID', type: 'string', value: attestation.userRefUID },
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
