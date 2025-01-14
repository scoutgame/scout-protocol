import { deployScoutTokenERC20, type ScoutTokenERC20TestFixture } from '../../../../deployScoutTokenERC20';
import { loadScoutTokenERC20Fixtures } from '../../../../fixtures';
import { walletFromKey, type GeneratedWallet } from '../../../../generateWallets';

describe('ScoutTokenERC20Proxy', function () {
  let token: ScoutTokenERC20TestFixture;
  let erc20AdminAccount: GeneratedWallet;
  let userAccount: GeneratedWallet;

  beforeEach(async () => {
    token = await loadScoutTokenERC20Fixtures();

    erc20AdminAccount = token.ScoutTokenERC20AdminAccount;
    userAccount = await walletFromKey();
  });

  describe('setImplementation()', function () {
    describe('effects', function () {
      it('updates the implementation address correctly, preserving balances and initialized state', async function () {
        const { ScoutTokenERC20Implementation: newImplementation } = await deployScoutTokenERC20();
        // Mint tokens to admin

        const wallet = await walletFromKey();

        const userBalance = BigInt(1000);

        await token.ScoutTokenERC20.write.transfer([wallet.account.address, userBalance], {
          account: erc20AdminAccount.account
        });

        const balanceBeforeUpgrade = await token.ScoutTokenERC20.read.balanceOf([wallet.account.address]);

        const initialized = await token.ScoutTokenERC20.read.isInitialized();
        expect(initialized).toEqual(true);

        expect(balanceBeforeUpgrade).toEqual(userBalance);

        await token.ScoutTokenERC20Proxy.write.setImplementation([newImplementation.address], {
          account: erc20AdminAccount.account
        });

        const balanceAfterUpgrade = await token.ScoutTokenERC20.read.balanceOf([wallet.account.address]);
        expect(balanceAfterUpgrade).toEqual(userBalance);

        const implementation = await token.ScoutTokenERC20Proxy.read.implementation();
        expect(implementation.toLowerCase()).toEqual(newImplementation.address.toLowerCase());

        const initializedAfterUpgrade = await token.ScoutTokenERC20.read.isInitialized();
        expect(initializedAfterUpgrade).toEqual(true);
      });
    });

    describe('permissions', function () {
      it('prevents non-admin from setting the implementation', async function () {
        const { ScoutTokenERC20Implementation: newImplementation } = await deployScoutTokenERC20();

        await expect(
          token.ScoutTokenERC20Proxy.write.setImplementation([newImplementation.address], {
            account: userAccount.account
          })
        ).rejects.toThrow('Caller is not the admin');

        const implementation = await token.ScoutTokenERC20Proxy.read.implementation();
        expect(implementation.toLowerCase()).toEqual(token.ScoutTokenERC20Implementation.address.toLowerCase());
      });
    });
  });
});
