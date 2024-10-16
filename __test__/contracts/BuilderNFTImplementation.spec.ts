import { loadContractFixtures } from "../fixtures";
import { generateWallets } from "../generateWallets";
import {v4 as uuid} from 'uuid';

describe('BuilderNFTImplementation.sol', function () {
  describe('write', function () {
    describe('registerBuilderToken()', function () {
      describe('effects', function () {

        it('Register a new builder token using a builderId', async function () {

          const { builderNft: {builderNftContract} } = await loadContractFixtures();

          const builderId = uuid(); // Sample UUID
          await expect(builderNftContract.write.registerBuilderToken([builderId])).resolves.toBeDefined();
    
          const tokenId = await builderNftContract.read.getBuilderIdForToken([BigInt(1)]);
          expect(tokenId).toBe(builderId);
        });
      });

      describe('permissions', function () {
        it('Only admin can register a builder token', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          const {userAccount} = await generateWallets();
  
          const builderId = uuid();
          await expect(builderNftContract.write.registerBuilderToken([builderId], {account: userAccount.account})).rejects.toThrow('Proxy: caller is not the admin');
        });
      });


      describe('validations', function () {
        it('Revert if the builderId is already registered', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
  
          await expect(builderNftContract.write.registerBuilderToken([builderId])).rejects.toThrow('Builder already registered');
        });

        it('Revert if the builderId is empty', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          await expect(builderNftContract.write.registerBuilderToken([null as any])).rejects.toThrow('Builder ID must be a valid UUID');
        });

        it('Revert if the builderId is an invalid uuid', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          await expect(builderNftContract.write.registerBuilderToken([''])).rejects.toThrow('Builder ID must be a valid UUID');
        });
      });

    });

    describe('mint()', function () {
      describe('effects', function () {
        it('Accept USDC and mint the requested amount of tokens for an NFT', async function () {
          const { builderNft: {builderNftContract},  usdc: {USDC, mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER} } = await loadContractFixtures();

          const {secondUserAccount} = await generateWallets();

          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
    
          const scoutId = uuid()
    
          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          await mintUSDCTo({account: secondUserAccount.account.address, amount: Number(price / USDC_DECIMALS_MULTIPLIER) });
   
          await approveUSDC({wallet: secondUserAccount, args: {spender: builderNftContract.address, amount: Number(price)}});
    
          await expect(builderNftContract.write.mint([testUserAddress, BigInt(1), BigInt(10), scoutId], { account: secondUserAccount.account }))
            .resolves.toBeDefined();
    
          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(10));
        });
      });

      describe('permissions', function () {
        it('Should revert if the caller has not provided USDC allowance to the contract', async function () {
          const { builderNft: {builderNftContract},  usdc: {USDC, mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER} } = await loadContractFixtures();

          const {secondUserAccount} = await generateWallets();

          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
    
          const scoutId = uuid()
    
          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          // Same code as mint code, but we don't provide a usdc balance
          await mintUSDCTo({account: secondUserAccount.account.address, amount: Number(price / USDC_DECIMALS_MULTIPLIER) });
   
          // Skip approval
          // await approveUSDC({wallet: secondUserAccount, args: {spender: builderNftContract.address, amount: Number(price)}});
    
          await expect(builderNftContract.write.mint([testUserAddress, BigInt(1), BigInt(10), scoutId], { account: secondUserAccount.account }))
            .rejects.toThrow('ERC20: transfer amount exceeds allowance');

          // Check balance unchanged
          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(0));
      });

      });

      describe('validations', function () {
        it('Revert if the caller\'s USDC balance is insufficent', async function () {
          const { builderNft: {builderNftContract},  usdc: {USDC, mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER} } = await loadContractFixtures();

          const {secondUserAccount} = await generateWallets();

          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
    
          const scoutId = uuid()
    
          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          // Same code as mint code, but we don't provide a usdc balance
          // await mintUSDCTo({account: secondUserAccount.account.address, amount: Number(price / USDC_DECIMALS_MULTIPLIER) });
   
          // Important to still approve USDC, even if we don't have the balance to differentiate error messages
          await approveUSDC({wallet: secondUserAccount, args: {spender: builderNftContract.address, amount: Number(price)}});
    
          await expect(builderNftContract.write.mint([testUserAddress, BigInt(1), BigInt(10), scoutId], { account: secondUserAccount.account }))
            .rejects.toThrow('ERC20: transfer amount exceeds balance');

          // Check balance unchanged
          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(0));
        });
      });
    });
  });
});



//   describe('Implementation Logic through Proxy', function () {
//     it('Should register a builder token', async function () {
   
//     });

//     it('Should mint tokens correctly', async function () {
//       const { proxyWithImplementationABI, paymentToken, otherAccount } = await loadContractFixtures();

//       const builderId = '123e4567-e89b-12d3-a456-426614174000';

//       const scoutId = uuid()

//       await proxyWithImplementationABI.write.registerBuilderToken([builderId]);

//       const price = await proxyWithImplementationABI.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);
//       await paymentToken.write.approve([proxyWithImplementationABI.address, price], {account: otherAccount.account});

//       await expect(proxyWithImplementationABI.write.mint([otherAccount.account.address, BigInt(1), BigInt(10), scoutId], { account: otherAccount.account }))
//         .resolves.toBeDefined();

//       const balance = await proxyWithImplementationABI.read.balanceOf([otherAccount.account.address, BigInt(1)]);
//       expect(balance).toBe(10);
//     });
//   });

//   describe('Upgradeability', function () {
//     it('Should preserve the state after upgrading the implementation', async function () {
//       const { proxy, proxyWithImplementationABI } = await loadContractFixtures();

//       const builderId = '123e4567-e89b-12d3-a456-426614174000';
//       await proxyWithImplementationABI.write.registerBuilderToken([builderId]);
//       const tokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
//       expect(tokenId).toBe(builderId);

//       const newImplementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

//       await builderNft.write.setImplementation([newImplementation.address]);

//       const newImplementationContractFromProxy = await builderNft.read.implementation();

//       expect(newImplementationContractFromProxy).toEqual(newImplementation);

//       const updatedTokenId = await proxyWithImplementationABI.read.getBuilderIdForToken([BigInt(1)]);
//       expect(updatedTokenId).toBe(builderId); // Check that state is preserved
//     });
//   });

//   describe('Reverting Edge Cases', function () {
//     it('Should revert when trying to mint with insufficient payment', async function () {
//       const { proxy, otherAccount, proxyWithImplementationABI } = await loadContractFixtures();

//       const scoutId = uuid()

//       const builderId = '123e4567-e89b-12d3-a456-426614174000';
//       await proxyWithImplementationABI.write.registerBuilderToken([builderId]);

//       await expect(
//         proxyWithImplementationABI.write.mint([otherAccount.account.address, BigInt(1), BigInt(10), scoutId], { account: otherAccount.account })
//       ).rejects.toThrow('Insufficient payment');
//     });

//     it('Should revert if a non-admin tries to register a builder token', async function () {
//       const { proxy, user, proxyWithImplementationABI } = await loadContractFixtures();

//       const builderId = uuid();

//       await expect(
//         proxyWithImplementationABI.write.registerBuilderToken([builderId], { account: user.account })
//       ).rejects.toThrow('Proxy: caller is not the admin');
//     });
//   });
// });