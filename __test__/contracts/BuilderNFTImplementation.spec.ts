import { loadContractFixtures } from "../fixtures";
import { generateWallets } from "../generateWallets";
import {v4 as uuid} from 'uuid';

describe('BuilderNFTImplementation.sol', function () {

  describe('write', function () {
    describe('registerBuilderToken()', function () {
      describe('effects', function () {

        it('Should allow the admin to register a builder token', async function () {

          const { builderNft: {builderNftContract} } = await loadContractFixtures();

          const builderId = uuid(); // Sample UUID
          await expect(builderNftContract.write.registerBuilderToken([builderId])).resolves.toBeDefined();
    
          const tokenId = await builderNftContract.read.getBuilderIdForToken([BigInt(1)]);
          expect(tokenId).toBe(builderId);
        });
      });

      describe('permissions', function () {
        it('Should deny another user than the admin to register a builder token', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          const {userAccount} = await generateWallets();
  
          const builderId = uuid();
          await expect(builderNftContract.write.registerBuilderToken([builderId], {account: userAccount.account})).rejects.toThrow('Proxy: caller is not the admin');
        });
      });


      describe('validations', function () {
        it('Should revert if the builderId is already registered', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
  
          await expect(builderNftContract.write.registerBuilderToken([builderId])).rejects.toThrow('Builder already registered');
        });

        it('Should revert if the builderId is an empty string', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          await expect(builderNftContract.write.registerBuilderToken([''])).rejects.toThrow('Builder ID must be a valid UUID');
        });

        it('Should revert if the builderId is an invalid uuid', async function () {
          const { builderNft: {builderNftContract} } = await loadContractFixtures();
  
          await expect(builderNftContract.write.registerBuilderToken([''])).rejects.toThrow('Builder ID must be a valid UUID');
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