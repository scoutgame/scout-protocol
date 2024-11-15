import { getAddress } from 'viem';

import type { BuilderNftSeason02Fixture } from '../../../../deployBuilderNftSeason02';
import { loadBuilderNFTSeason02Fixtures } from '../../../../fixtures';
import { walletFromKey } from '../../../../generateWallets';

describe('BuilderNFTSeason02Upgradeable', function () {
  let builderNftSeason02: BuilderNftSeason02Fixture;

  beforeEach(async () => {
    const fixtures = await loadBuilderNFTSeason02Fixtures();

    builderNftSeason02 = fixtures.builderNftSeason02;
    erc1155AdminAccount = fixtures.builderNftSeason02.builderNftAdminAccount;
    userAccount = await walletFromKey();
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
