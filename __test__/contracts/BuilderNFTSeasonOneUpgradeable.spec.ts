import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { viem, } from 'hardhat';
import { parseGwei, decodeEventLog, getAddress } from 'viem';
import { NULL_ADDRESS } from '../../lib/constants';
import {v4 as uuid} from 'uuid';
import { loadContractFixtures } from '../fixtures';

describe('BuilderNFT Proxy and Implementation', function () {
 

  describe('Proxy and Initialization', function () {
    it('Should set the correct admin, implementation, and payment token', async function () {
      const { builderNft: {builderProxyContract, builderNftAdminAccount, builderImplementationContract, builderNftContract}, usdc: {USDC} } = await loadContractFixtures();

      const proxyAdmin = await builderProxyContract.read.admin();
      const proxyImplementation = await builderProxyContract.read.implementation();
      const erc20Contract = await builderNftContract.read.getERC20ContractV2();

      expect(getAddress(proxyAdmin)).toBe(getAddress(builderNftAdminAccount.account.address));
      expect(getAddress(proxyImplementation)).toBe(getAddress(builderImplementationContract.address));
      expect(getAddress(erc20Contract.toLowerCase())).toBe(getAddress(USDC.address));
    });

    it('Should allow the admin to change the implementation', async function () {
      const { builderNft: {builderProxyContract}  } = await loadContractFixtures();

      const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

      await expect(builderProxyContract.write.setImplementation([newImplementation.address])).resolves.toBeDefined();

      const updatedImplementation = await builderProxyContract.read.implementation();
      expect(updatedImplementation).toBe(getAddress(newImplementation.address));
    });
  });

  //   it('Should revert if a non-admin tries to change the implementation', async function () {
  //     const { proxy, user } = await loadContractFixtures();

  //     const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

  //     await expect(builderNft.write.setImplementation([newImplementation.address], { account: user.account})).rejects.toThrow(
  //       'Proxy: caller is not the admin'
  //     );
  //   });
  // });

  // describe('Implementation Logic through Proxy', function () {
  //   it('Should register a builder token', async function () {
  //     const { proxyWithImplementationABI } = await loadContractFixtures();

  //     const builderId = '123e4567-e89b-12d3-a456-426614174000'; // Sample UUID
  //     await expect(proxyWithImplementationABI.write.registerBuilderToken([builderId])).resolves.toBeDefined();

  //     const tokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
  //     expect(tokenId).toBe(builderId);
  //   });

  //   it('Should mint tokens correctly', async function () {
  //     const { proxyWithImplementationABI, paymentToken, otherAccount } = await loadContractFixtures();

  //     const builderId = '123e4567-e89b-12d3-a456-426614174000';

  //     const scoutId = uuid()

  //     await proxyWithImplementationABI.write.registerBuilderToken([builderId]);

  //     const price = await proxyWithImplementationABI.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);
  //     await paymentToken.write.approve([proxyWithImplementationABI.address, price], {account: otherAccount.account});

  //     await expect(proxyWithImplementationABI.write.mint([otherAccount.account.address, BigInt(1), BigInt(10), scoutId], { account: otherAccount.account }))
  //       .resolves.toBeDefined();

  //     const balance = await proxyWithImplementationABI.read.balanceOf([otherAccount.account.address, BigInt(1)]);
  //     expect(balance).toBe(10);
  //   });
  // });

  // describe('Upgradeability', function () {
  //   it('Should preserve the state after upgrading the implementation', async function () {
  //     const { proxy, proxyWithImplementationABI } = await loadContractFixtures();

  //     const builderId = '123e4567-e89b-12d3-a456-426614174000';
  //     await proxyWithImplementationABI.write.registerBuilderToken([builderId]);
  //     const tokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
  //     expect(tokenId).toBe(builderId);

  //     const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

  //     await builderNft.write.setImplementation([newImplementation.address]);

  //     const newImplementationContractFromProxy = await builderNft.read.implementation();

  //     expect(newImplementationContractFromProxy).toEqual(newImplementation);

  //     const updatedTokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
  //     expect(updatedTokenId).toBe(builderId); // Check that state is preserved
  //   });
  // });

  // describe('Reverting Edge Cases', function () {
  //   it('Should revert when trying to mint with insufficient payment', async function () {
  //     const { proxy, otherAccount, proxyWithImplementationABI } = await loadContractFixtures();

  //     const scoutId = uuid()

  //     const builderId = '123e4567-e89b-12d3-a456-426614174000';
  //     await proxyWithImplementationABI.write.registerBuilderToken([builderId]);

  //     await expect(
  //       proxyWithImplementationABI.write.mint([otherAccount.account.address, BigInt(1), BigInt(10), scoutId], { account: otherAccount.account })
  //     ).rejects.toThrow('Insufficient payment');
  //   });

  //   it('Should revert if a non-admin tries to register a builder token', async function () {
  //     const { proxy, user, proxyWithImplementationABI } = await loadContractFixtures();

  //     const builderId = uuid();

  //     await expect(
  //       proxyWithImplementationABI.write.registerBuilderToken([builderId], { account: user.account })
  //     ).rejects.toThrow('Proxy: caller is not the admin');
  //   });
  // });
});