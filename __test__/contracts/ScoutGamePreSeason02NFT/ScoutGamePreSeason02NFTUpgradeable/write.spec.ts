import { viem } from 'hardhat';
import { getAddress } from 'viem';

import type { BuilderNftSeason02Fixture } from '../../../deployScoutGamePreSeason02NftContract';
import { deployEASContracts } from '../../../deployEAS';
import { loadBuilderNFTPreSeason02Fixtures } from '../../../fixtures';
import { walletFromKey, type GeneratedWallet } from '../../../generateWallets';

function deployImplementation() {
  return viem.deployContract('ScoutGamePreSeason02NFTImplementation', []);
}

type DeployedImplementation = Awaited<ReturnType<typeof deployImplementation>>;

describe('ScoutGamePreSeason02NFTUpgradeable', function () {
  let builderNftSeason02: BuilderNftSeason02Fixture;
  let erc1155AdminAccount: GeneratedWallet;
  let userAccount: GeneratedWallet;
  let newImplementation: DeployedImplementation;

  beforeEach(async () => {
    const fixtures = await loadBuilderNFTPreSeason02Fixtures();

    builderNftSeason02 = fixtures.builderNftSeason02;
    erc1155AdminAccount = fixtures.builderNftSeason02.builderNftAdminAccount;
    userAccount = await walletFromKey();
    newImplementation = await deployImplementation();
  });

  describe('setImplementation()', function () {
    describe('effects', function () {
      it('Updates the implementation address correctly', async function () {
        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation([newImplementation.address], {
            account: erc1155AdminAccount.account
          })
        ).resolves.toBeDefined();

        const implementationAddress = await builderNftSeason02.builderProxyContract.read.implementation();
        expect(getAddress(implementationAddress)).toEqual(getAddress(newImplementation.address));
      });
    });

    describe('permissions', function () {
      it('Allows admin to set implementation', async function () {
        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation([newImplementation.address], {
            account: erc1155AdminAccount.account
          })
        ).resolves.toBeDefined();
      });

      it('Prevents non-admin from setting implementation', async function () {
        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation([newImplementation.address], {
            account: userAccount.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });

    describe('validations', function () {
      it('Reverts if new implementation address is zero address', async function () {
        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation(
            ['0x0000000000000000000000000000000000000000'],
            { account: erc1155AdminAccount.account }
          )
        ).rejects.toThrow('Invalid implementation address');
      });

      it('Reverts if new implementation address is an EOA wallet', async function () {
        const wallet = await walletFromKey();

        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation([wallet.account.address], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('Invalid address, must be a smart contract');
      });

      it('Reverts if new implementation address does not accept the upgrade', async function () {
        const badContract = await deployEASContracts().then((c) => c.ProtocolEASResolverContract);

        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation([badContract.address], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('Invalid address, must accept the upgrade');
      });

      it('Reverts if new implementation address is the same as current', async function () {
        const currentImplementation = await builderNftSeason02.builderProxyContract.read.implementation();

        await expect(
          builderNftSeason02.builderProxyContract.write.setImplementation([currentImplementation], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('New implementation must be different');
      });
    });
  });
});