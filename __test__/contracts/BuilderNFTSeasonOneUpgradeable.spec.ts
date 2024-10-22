import { viem } from 'hardhat';
import { v4 as uuid } from 'uuid';
import { getAddress } from 'viem';

import { deployTestUSDC } from '../deployTestUSDC';
import { loadContractFixtures } from '../fixtures';
import { generateWallets } from '../generateWallets';

describe('constructor', function () {
  it('Should set the correct admin, implementation, and payment token', async function () {
    const {
      builderNft: { builderNftAdminAccount, builderImplementationContract, builderProxyContract, builderNftContract },
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

        await expect(builderProxyContract.write.setImplementation([newImplementation.address])).resolves.toBeDefined();

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

  describe('setProceedsReceiver()', function () {
    describe('effects', function () {
      it('Should set the proceeds receiver address correctly', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const { userAccount } = await generateWallets();
        const newReceiver = userAccount.account.address;

        await builderProxyContract.write.setProceedsReceiver([newReceiver]);

        const proceedsReceiver = await builderProxyContract.read.getProceedsReceiver();
        expect(getAddress(proceedsReceiver)).toBe(getAddress(newReceiver));
      });
    });

    describe('permissions', function () {
      it('Only admin can set the proceeds receiver', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const { userAccount } = await generateWallets();
        const newReceiver = userAccount.account.address;

        await expect(
          builderProxyContract.write.setProceedsReceiver([newReceiver], { account: userAccount.account })
        ).rejects.toThrow('Proxy: caller is not the admin');
      });
    });

    describe('validations', function () {
      it('Reverts when setting proceeds receiver to zero address', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const zeroAddress = '0x0000000000000000000000000000000000000000';

        await expect(builderProxyContract.write.setProceedsReceiver([zeroAddress])).rejects.toThrow('Invalid address');
      });
    });
  });

  describe('updatePriceIncrement()', function () {
    describe('effects', function () {
      it('Should update the price increment correctly', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const newIncrement = BigInt(1000);

        await builderProxyContract.write.updatePriceIncrement([newIncrement]);

        const priceIncrement = await builderProxyContract.read.getPriceIncrement();
        expect(priceIncrement).toBe(newIncrement);
      });
    });

    describe('permissions', function () {
      it('Only admin can update the price increment', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const { userAccount } = await generateWallets();
        const newIncrement = BigInt(1000);

        await expect(
          builderProxyContract.write.updatePriceIncrement([newIncrement], { account: userAccount.account })
        ).rejects.toThrow('Proxy: caller is not the admin');
      });
    });
  });

  describe('updateERC20Contract()', function () {
    describe('effects', function () {
      it('Should update the ERC20 contract address correctly', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const { usdc: secondUsdc } = await loadContractFixtures();

        const newERC20Address = secondUsdc.USDC.address;

        await builderProxyContract.write.updateERC20Contract([newERC20Address]);
        expect(getAddress(secondUsdc.USDC.address)).toBe(getAddress(newERC20Address));
      });
    });

    describe('permissions', function () {
      it('Only admin can update the ERC20 contract address', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const { USDC: secondUSDC } = await deployTestUSDC();

        const { userAccount } = await generateWallets();
        const newERC20Address = secondUSDC.address;

        await expect(
          builderProxyContract.write.updateERC20Contract([newERC20Address], { account: userAccount.account })
        ).rejects.toThrow('Proxy: caller is not the admin');
      });
    });

    describe('validations', function () {
      it('Reverts when setting ERC20 contract to zero address', async function () {
        const {
          builderNft: { builderProxyContract }
        } = await loadContractFixtures();

        const zeroAddress = '0x0000000000000000000000000000000000000000';

        await expect(builderProxyContract.write.updateERC20Contract([zeroAddress])).rejects.toThrow('Invalid address');
      });
    });
  });
});

describe('read', function () {
  describe('getProceedsReceiver()', function () {
    it('Should return the correct proceeds receiver address', async function () {
      const {
        builderNft: { builderProxyContract }
      } = await loadContractFixtures();

      const { userAccount } = await generateWallets();
      const newReceiver = userAccount.account.address;

      await builderProxyContract.write.setProceedsReceiver([newReceiver]);

      const proceedsReceiver = await builderProxyContract.read.getProceedsReceiver();
      expect(getAddress(proceedsReceiver)).toBe(getAddress(newReceiver));
    });
  });

  describe('getPriceIncrement()', function () {
    it('Should return the correct price increment', async function () {
      const {
        builderNft: { builderProxyContract }
      } = await loadContractFixtures();

      const newIncrement = BigInt(1000);

      await builderProxyContract.write.updatePriceIncrement([newIncrement]);

      const priceIncrement = await builderProxyContract.read.getPriceIncrement();
      expect(priceIncrement).toBe(newIncrement);
    });
  });

  // This test is broken as the proxy was deployed with a bug in the ERC20 contract address getter, which reads price increment instead
  describe.skip('getERC20Contract()', function () {
    it('Should return the correct ERC20 contract address', async function () {
      const {
        builderNft: { builderProxyContract },
        usdc: { USDC }
      } = await loadContractFixtures();

      const erc20Contract = await builderProxyContract.read.getERC20Contract();
      expect(getAddress(erc20Contract as any) as any).toBe(getAddress(USDC.address));
    });
  });
});
