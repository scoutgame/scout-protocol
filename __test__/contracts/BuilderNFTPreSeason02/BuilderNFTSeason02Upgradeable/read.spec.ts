import { getAddress } from 'viem';

import type { BuilderNftSeason02Fixture } from '../../../deployBuilderNftPreSeason02';
import { loadBuilderNFTPreSeason02Fixtures } from '../../../fixtures';

describe('ScoutGamePreSeason02NFTUpgradeable', function () {
  let builderNftSeason02: BuilderNftSeason02Fixture;

  beforeEach(async () => {
    const fixtures = await loadBuilderNFTPreSeason02Fixtures();

    builderNftSeason02 = fixtures.builderNftSeason02;
  });

  describe('implementation()', function () {
    describe('returns', function () {
      it('Returns the current implementation address', async function () {
        const implementationAddress = await builderNftSeason02.builderProxyContract.read.implementation();
        expect(getAddress(implementationAddress)).toEqual(
          getAddress(builderNftSeason02.builderImplementationContract.address)
        );
      });
    });
  });
});
