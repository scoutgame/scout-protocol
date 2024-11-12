import { NULL_EAS_REF_UID, type ContributionReceiptAttestation } from '@charmverse/core/protocol';

import { deployEASContracts } from '../deployEAS';

describe('deployEAS', function () {
  it('should deploy EAS contract along with the builder event schema and Protocol Resolver', async function () {
    const { attestContributionReceipt, getContributionReceipt } = await deployEASContracts();

    const data: ContributionReceiptAttestation = {
      userRefUID: NULL_EAS_REF_UID,
      description: 'Example',
      metadataUrl: 'https://example.com/metadataUrl',
      url: 'https://example.com',
      type: 'merged_pr',
      value: 100
    };

    const attestationUid = await attestContributionReceipt({ data });

    const onchainAttestationData = await getContributionReceipt(attestationUid);

    expect(onchainAttestationData).toMatchObject(data);
  });
});
