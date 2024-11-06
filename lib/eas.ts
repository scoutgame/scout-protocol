import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';

export const builderEventEASSchema = 'string scoutId,string url,uint256 value,string type';

export type BuilderEventAttestation = {
  scoutId: string;
  url: string;
  value: number;
  type: string;
};

const encoder = new SchemaEncoder(builderEventEASSchema);

export const NULL_EAS_REF_UID = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function encodeBuilderEventAttestation(attestation: BuilderEventAttestation): `0x${string}` {
  const encodedData = encoder.encodeData([
    { name: 'scoutId', type: 'string', value: attestation.scoutId },
    {
      name: 'url',
      type: 'string',
      value: attestation.url
    },
    { name: 'value', type: 'uint256', value: attestation.value },
    { name: 'type', type: 'string', value: attestation.type }
  ]);

  return encodedData as `0x${string}`;
}

export function decodeBuilderEventAttestation(rawData: string): BuilderEventAttestation {
  const parsed = encoder.decodeData(rawData);
  const values = parsed.reduce((acc, item) => {
    const key = item.name as keyof BuilderEventAttestation;

    if (key === 'value') {
      acc[key] = parseInt(item.value.value as string);
    } else {
      acc[key] = item.value.value as string;
    }
    return acc;
  }, {} as BuilderEventAttestation);

  return values as BuilderEventAttestation;
}
