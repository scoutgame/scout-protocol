import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { viem, } from 'hardhat';
import { parseGwei, decodeEventLog } from 'viem';
import { NULL_ADDRESS } from '../../lib/constants';
import {v4 as uuid} from 'uuid';

describe('BuilderNFT Proxy and Implementation', function () {
  async function deployContracts() {
    const [admin, user, otherAccount] = await viem.getWalletClients();

    const memoryUtils = await viem.deployContract('MemoryUtils');

    const implementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

    const paymentToken = await viem.deployContract('MockERC20');

    const proceedsReceiver = otherAccount.account.address;

    const proxy = await viem.deployContract('BuilderNFTSeasonOneUpgradeable', [
      implementation.address,
      paymentToken.address,
      proceedsReceiver,
    ]);

    // Make the implementation ABI available to the proxy
    const proxyWithImplementationABI = await viem.getContractAt(
      'BuilderNFTSeasonOneImplementation01', // Implementation ABI
      proxy.address,                        // Proxy address
      { client: { wallet: admin } }         // Use the admin account for interaction
    );

    return { proxy, proxyWithImplementationABI, implementation, admin, user, otherAccount, paymentToken };
  }

  describe('Proxy and Initialization', function () {
    it('Should set the correct admin, implementation, and payment token', async function () {
      const { proxy, admin, paymentToken } = await loadFixture(deployContracts);

      const proxyAdmin = await proxy.read.admin();
      const proxyImplementation = await proxy.read.implementation();
      const erc20Contract = await proxy.read.getERC20Contract();

      expect(proxyAdmin).toBe(admin.account.address);
      expect(proxyImplementation).not.toBe(NULL_ADDRESS);
      expect(erc20Contract).toBe(paymentToken.address);
    });

    it('Should allow the admin to change the implementation', async function () {
      const { proxy, implementation } = await loadFixture(deployContracts);

      const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

      await expect(proxy.write.setImplementation([newImplementation.address])).resolves.toBeDefined();

      const updatedImplementation = await proxy.read.implementation();
      expect(updatedImplementation).toBe(newImplementation.address);
    });

    it('Should revert if a non-admin tries to change the implementation', async function () {
      const { proxy, user } = await loadFixture(deployContracts);

      const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

      await expect(proxy.write.setImplementation([newImplementation.address], { account: user.account})).rejects.toThrow(
        'Proxy: caller is not the admin'
      );
    });
  });

  describe('Implementation Logic through Proxy', function () {
    it('Should register a builder token', async function () {
      const { proxyWithImplementationABI } = await loadFixture(deployContracts);

      const builderId = '123e4567-e89b-12d3-a456-426614174000'; // Sample UUID
      await expect(proxyWithImplementationABI.write.registerBuilderToken([builderId])).resolves.toBeDefined();

      const tokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
      expect(tokenId).toBe(builderId);
    });

    it('Should mint tokens correctly', async function () {
      const { proxyWithImplementationABI, paymentToken, otherAccount } = await loadFixture(deployContracts);

      const builderId = '123e4567-e89b-12d3-a456-426614174000';

      const scoutId = uuid()

      await proxyWithImplementationABI.write.registerBuilderToken([builderId]);

      const price = await proxyWithImplementationABI.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);
      await paymentToken.write.approve([proxyWithImplementationABI.address, price], {account: otherAccount.account});

      await expect(proxyWithImplementationABI.write.mint([otherAccount.account.address, BigInt(1), BigInt(10), scoutId], { account: otherAccount.account }))
        .resolves.toBeDefined();

      const balance = await proxyWithImplementationABI.read.balanceOf([otherAccount.account.address, BigInt(1)]);
      expect(balance).toBe(10);
    });
  });

  describe('Upgradeability', function () {
    it('Should preserve the state after upgrading the implementation', async function () {
      const { proxy, proxyWithImplementationABI } = await loadFixture(deployContracts);

      const builderId = '123e4567-e89b-12d3-a456-426614174000';
      await proxyWithImplementationABI.write.registerBuilderToken([builderId]);
      const tokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
      expect(tokenId).toBe(builderId);

      const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

      await proxy.write.setImplementation([newImplementation.address]);

      const newImplementationContractFromProxy = await proxy.read.implementation();

      expect(newImplementationContractFromProxy).toEqual(newImplementation);

      const updatedTokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
      expect(updatedTokenId).toBe(builderId); // Check that state is preserved
    });
  });

  describe('Reverting Edge Cases', function () {
    it('Should revert when trying to mint with insufficient payment', async function () {
      const { proxy, otherAccount, proxyWithImplementationABI } = await loadFixture(deployContracts);

      const scoutId = uuid()

      const builderId = '123e4567-e89b-12d3-a456-426614174000';
      await proxyWithImplementationABI.write.registerBuilderToken([builderId]);

      await expect(
        proxyWithImplementationABI.write.mint([otherAccount.account.address, BigInt(1), BigInt(10), scoutId], { account: otherAccount.account })
      ).rejects.toThrow('Insufficient payment');
    });

    it('Should revert if a non-admin tries to register a builder token', async function () {
      const { proxy, user, proxyWithImplementationABI } = await loadFixture(deployContracts);

      const builderId = uuid();

      await expect(
        proxyWithImplementationABI.write.registerBuilderToken([builderId], { account: user.account })
      ).rejects.toThrow('Proxy: caller is not the admin');
    });
  });
});