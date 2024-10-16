import { viem, } from 'hardhat';
import { getAddress } from 'viem';
import { loadContractFixtures } from '../fixtures';
import { generateWallets } from '../generateWallets';

describe('BuilderNFT Proxy', function () {

  
  describe('constructor()', function () {
    it('Should set the correct admin, implementation, and payment token', async function () {
      const { builderNft: {builderProxyContract, builderNftAdminAccount, builderImplementationContract, builderNftContract}, usdc: {USDC} } = await loadContractFixtures();

      const proxyAdmin = await builderProxyContract.read.admin();
      const proxyImplementation = await builderProxyContract.read.implementation();
      const erc20Contract = await builderNftContract.read.getERC20ContractV2();

      expect(getAddress(proxyAdmin)).toBe(getAddress(builderNftAdminAccount.account.address));
      expect(getAddress(proxyImplementation)).toBe(getAddress(builderImplementationContract.address));
      expect(getAddress(erc20Contract.toLowerCase())).toBe(getAddress(USDC.address));
    });

  });

  describe('setImplementation()', function () {

    describe('effects', function () {
      it('Should allow the admin to change the implementation', async function () {
        const { builderNft: {builderProxyContract}  } = await loadContractFixtures();
  
        const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');
  
        await expect(builderProxyContract.write.setImplementation([newImplementation.address])).resolves.toBeDefined();
  
        const updatedImplementation = await builderProxyContract.read.implementation();
        expect(updatedImplementation).toBe(getAddress(newImplementation.address));
      });
    });

    describe('permissions', function () {
      it('Should NOT allow another user than the admin to change the implementation', async function () {
        const { builderNft: {builderProxyContract}  } = await loadContractFixtures();

        const {userAccount} = await generateWallets();

        const currentImplementation = await builderProxyContract.read.implementation();

        const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

        await expect(builderProxyContract.write.setImplementation([newImplementation.address], {account: userAccount.account})).rejects.toThrow('Proxy: caller is not the admin');

        const updatedImplementation = await builderProxyContract.read.implementation();

        expect(updatedImplementation).toBe(currentImplementation);
      });
    });

  });

});