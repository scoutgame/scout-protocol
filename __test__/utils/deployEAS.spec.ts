import { v4 as uuid } from 'uuid';

import type { BuilderEventAttestation } from '../../lib/eas';
import { deployEASContracts } from '../deployEAS';

describe('deployEAS', function () {
  it('should deploy EAS contract along with the builder event schema and Protocol Resolver', async function () {
    const { attestContributionReceipt, getContributionReceipt } = await deployEASContracts();

    const data: BuilderEventAttestation = {
      scoutId: uuid(),
      url: 'https://example.com',
      type: 'merged_pr',
      value: 100
    };

    const attestationUid = await attestContributionReceipt({ data });

    const onchainAttestationData = await getContributionReceipt(attestationUid);

    expect(onchainAttestationData).toMatchObject(data);
  });
});
