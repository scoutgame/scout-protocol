import { viem } from 'hardhat';
import { v4 as uuid } from 'uuid';
import { getAddress } from 'viem';

import { loadContractFixtures } from '../fixtures';
import { generateWallets } from '../generateWallets';

describe('BuilderNFT Proxy', function () {
  describe('constructor', function () {
    it('Should set the correct admin, implementation, and payment token', async function () {
      const {
        builderNft: { builderProxyContract, builderNftAdminAccount, builderImplementationContract, builderNftContract },
        usdc: { USDC }
      } = await loadContractFixtures();

      const proxyAdmin = await builderProxyContract.read.admin();
      const proxyImplementation = await builderProxyContract.read.implementation();
      const erc20Contract = await builderNftContract.read.getERC20ContractV2();

      expect(getAddress(proxyAdmin)).toBe(getAddress(builderNftAdminAccount.account.address));
      expect(getAddress(proxyImplementation)).toBe(getAddress(builderImplementationContract.address));
      expect(getAddress(erc20Contract.toLowerCase())).toBe(getAddress(USDC.address));
    });
  });

  describe('write', function () {
    describe('setImplementation()', function () {
      describe('effects', function () {
        it('Should allow the admin to change the implementation', async function () {
          const {
            builderNft: { builderProxyContract }
          } = await loadContractFixtures();

          const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

          await expect(
            builderProxyContract.write.setImplementation([newImplementation.address])
          ).resolves.toBeDefined();

          const updatedImplementation = await builderProxyContract.read.implementation();
          expect(updatedImplementation).toBe(getAddress(newImplementation.address));
        });

        it('Should preserve state between implementation changes', async function () {
          const {
            builderNft: { builderProxyContract, builderNftContract }
          } = await loadContractFixtures();

          const { userAccount } = await generateWallets();

          // Create 3 builder tokens
          await builderNftContract.write.registerBuilderToken([uuid()]);

          await builderNftContract.write.registerBuilderToken([uuid()]);

          await builderNftContract.write.registerBuilderToken([uuid()]);

          const tokenId = BigInt(2);

          const tokensBought = BigInt(7);

          const scoutId = uuid();

          await builderNftContract.write.mintTo([userAccount.account.address, tokenId, tokensBought, scoutId]);

          const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

          await builderProxyContract.write.setImplementation([newImplementation.address]);

          const updatedImplementation = await builderProxyContract.read.implementation();
          expect(updatedImplementation).toBe(getAddress(newImplementation.address));

          const balance = await builderNftContract.read.balanceOf([userAccount.account.address, tokenId]);

          expect(balance).toBe(tokensBought);
        });
      });

      describe('permissions', function () {
        it('Should deny another user than the admin to change the implementation', async function () {
          const {
            builderNft: { builderProxyContract }
          } = await loadContractFixtures();

          const { userAccount } = await generateWallets();

          const currentImplementation = await builderProxyContract.read.implementation();

          const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

          await expect(
            builderProxyContract.write.setImplementation([newImplementation.address], { account: userAccount.account })
          ).rejects.toThrow('Proxy: caller is not the admin');

          const updatedImplementation = await builderProxyContract.read.implementation();

          expect(updatedImplementation).toBe(currentImplementation);
        });
      });
    });
  });
});
