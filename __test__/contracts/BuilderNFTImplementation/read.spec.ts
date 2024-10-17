import { getAddress, parseEventLogs } from "viem";
import { loadContractFixtures } from "../../fixtures";
import { generateWallets } from "../../generateWallets";
import { v4 as uuid } from 'uuid';

describe('BuilderNFTImplementation.sol', function () {

  describe('read', function () {
    describe('balanceOf()', function () {
      it('Returns the correct balance of tokens for an account and tokenId', async function () {
        const {
          builderNft: { builderNftContract },
          usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
        } = await loadContractFixtures();

        const { secondUserAccount } = await generateWallets();
        const testUserAddress = secondUserAccount.account.address;

        const builderId = uuid();
        await builderNftContract.write.registerBuilderToken([builderId]);

        const scoutId = uuid();
        const tokenId = BigInt(1);
        const amount = BigInt(10);
        const price = await builderNftContract.read.getTokenPurchasePrice([tokenId, amount]);

        await mintUSDCTo({
          account: testUserAddress,
          amount: Number(price / USDC_DECIMALS_MULTIPLIER),
        });
        await approveUSDC({
          wallet: secondUserAccount,
          args: { spender: builderNftContract.address, amount: Number(price) },
        });

        await builderNftContract.write.mint(
          [testUserAddress, tokenId, amount, scoutId],
          { account: secondUserAccount.account }
        );

        const balance = await builderNftContract.read.balanceOf([testUserAddress, tokenId]);
        expect(balance).toBe(amount);
      });

      it('Returns zero for accounts with no tokens', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const { secondUserAccount } = await generateWallets();
        const testUserAddress = secondUserAccount.account.address;
        const tokenId = BigInt(1);

        const balance = await builderNftContract.read.balanceOf([testUserAddress, tokenId]);
        expect(balance).toBe(BigInt(0));
      });
    });

    describe('balanceOfBatch()', function () {
      it('Returns correct balances for multiple accounts and tokenIds', async function () {
        const {
          builderNft: { builderNftContract },
          usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
        } = await loadContractFixtures();
        const { userAccount: firstUserAccount, secondUserAccount } = await generateWallets();

        const user1Address = firstUserAccount.account.address;
        const user2Address = secondUserAccount.account.address;
        const builderId1 = uuid();
        const builderId2 = uuid();

        await builderNftContract.write.registerBuilderToken([builderId1]);
        await builderNftContract.write.registerBuilderToken([builderId2]);

        const scoutId = uuid();
        const tokenId1 = BigInt(1);
        const tokenId2 = BigInt(2);

        const amount1 = BigInt(5);
        const amount2 = BigInt(10);

        const price1 = await builderNftContract.read.getTokenPurchasePrice([tokenId1, amount1]);
        const price2 = await builderNftContract.read.getTokenPurchasePrice([tokenId2, amount2]);

        await mintUSDCTo({
          account: user1Address,
          amount: Number(price1 / USDC_DECIMALS_MULTIPLIER),
        });
        await approveUSDC({
          wallet: firstUserAccount,
          args: { spender: builderNftContract.address, amount: Number(price1) },
        });

        await builderNftContract.write.mint(
          [user1Address, tokenId1, amount1, scoutId],
          { account: firstUserAccount.account }
        );

        await mintUSDCTo({
          account: user2Address,
          amount: Number(price2 / USDC_DECIMALS_MULTIPLIER),
        });
        await approveUSDC({
          wallet: secondUserAccount,
          args: { spender: builderNftContract.address, amount: Number(price2) },
        });

        await builderNftContract.write.mint(
          [user2Address, tokenId2, amount2, scoutId],
          { account: secondUserAccount.account }
        );

        const accounts = [user1Address, user2Address];
        const tokenIds = [tokenId1, tokenId2];

        const balances = await builderNftContract.read.balanceOfBatch([accounts, tokenIds]);

        expect(balances[0]).toBe(amount1);
        expect(balances[1]).toBe(amount2);
      });

      it('Returns zeros for accounts with no tokens', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();
        const { userAccount: firstUserAccount, secondUserAccount } = await generateWallets();

        const user1Address = firstUserAccount.account.address;
        const user2Address = secondUserAccount.account.address;
        const tokenIds = [BigInt(1), BigInt(2)];
        const accounts = [user1Address, user2Address];

        const balances = await builderNftContract.read.balanceOfBatch([accounts, tokenIds]);

        expect(balances[0]).toBe(BigInt(0));
        expect(balances[1]).toBe(BigInt(0));
      });
    });

    describe('getERC20ContractV2()', function () {
      it('Returns the address of USDC contract', async function () {
        const { builderNft: { builderNftContract }, usdc: { USDC } } = await loadContractFixtures();

        const paymentTokenAddress = await builderNftContract.read.getERC20ContractV2();

        expect(paymentTokenAddress).toBe(getAddress(USDC.address));
      });
    });

    describe('getTokenPurchasePrice()', function () {
      it('Returns the correct price for purchasing a given amount of tokens, taking into account current supply and bonding curve formula of 2S + 2', async function () {
        const { builderNft: { builderNftContract, builderNftAdminAccount } } = await loadContractFixtures();

        const {userAccount} = await generateWallets();

        const builderId = uuid();
        await builderNftContract.write.registerBuilderToken([builderId]);

        const tokenId = BigInt(1);

        const priceForOneToken = await builderNftContract.read.getTokenPurchasePrice([tokenId, BigInt(1)]);

        expect(priceForOneToken).toBe(BigInt(2e6));

        const priceForTwoTokens = await builderNftContract.read.getTokenPurchasePrice([tokenId, BigInt(2)]);

        expect(priceForTwoTokens).toBe(BigInt(6e6));

        const priceForThreeTokens = await builderNftContract.read.getTokenPurchasePrice([tokenId, BigInt(3)]);

        expect(priceForThreeTokens).toBe(BigInt(12e6));

        const minted = BigInt(3);

        await builderNftContract.write.mintTo([userAccount.account.address, tokenId, minted, builderId], { account: builderNftAdminAccount.account });

        const price = await builderNftContract.read.getTokenPurchasePrice([tokenId, BigInt(1)]);

        expect(price).toBe(BigInt(8e6));

        await builderNftContract.write.burn([userAccount.account.address, tokenId, BigInt(2)], { account: builderNftAdminAccount.account });

        const priceAfterBurn = await builderNftContract.read.getTokenPurchasePrice([tokenId, BigInt(1)]);

        // Burned 2 tokens, 1 token remains in supply (S) so the price should be 4e6, which is 2S + 2
        expect(priceAfterBurn).toBe(BigInt(4e6));

      });
    });

    describe('totalSupply()', function () {
      it('Returns the total supply of a given tokenId', async function () {
        const {
          builderNft: { builderNftContract },
          usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
        } = await loadContractFixtures();

        const { secondUserAccount } = await generateWallets();
        const testUserAddress = secondUserAccount.account.address;

        const builderId = uuid();
        await builderNftContract.write.registerBuilderToken([builderId]);

        const scoutId = uuid();
        const tokenId = BigInt(1);
        const amount = BigInt(10);
        const price = await builderNftContract.read.getTokenPurchasePrice([tokenId, amount]);

        await mintUSDCTo({
          account: testUserAddress,
          amount: Number(price / USDC_DECIMALS_MULTIPLIER),
        });
        await approveUSDC({
          wallet: secondUserAccount,
          args: { spender: builderNftContract.address, amount: Number(price) },
        });

        await builderNftContract.write.mint(
          [testUserAddress, tokenId, amount, scoutId],
          { account: secondUserAccount.account }
        );

        const totalSupply = await builderNftContract.read.totalSupply([tokenId]);
        expect(totalSupply).toBe(amount);
      });

      it('Returns zero for tokens with no supply', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const tokenId = BigInt(1);
        const totalSupply = await builderNftContract.read.totalSupply([tokenId]);
        expect(totalSupply).toBe(BigInt(0));
      });
    });

    describe('getBuilderIdForToken()', function () {
      it('Returns the correct builderId for a given tokenId', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const builderId = uuid();
        await builderNftContract.write.registerBuilderToken([builderId]);

        const tokenId = BigInt(1);
        const returnedBuilderId = await builderNftContract.read.getBuilderIdForToken([tokenId]);
        expect(returnedBuilderId).toBe(builderId);
      });

      it('Reverts if the tokenId is not registered', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const invalidTokenId = BigInt(999);
        await expect(
          builderNftContract.read.getBuilderIdForToken([invalidTokenId])
        ).rejects.toThrow('Token not yet allocated');
      });
    });

    describe('getTokenIdForBuilder()', function () {
      it('Returns the correct tokenId for a given builderId', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const builderId = uuid();
        await builderNftContract.write.registerBuilderToken([builderId]);

        const tokenId = await builderNftContract.read.getTokenIdForBuilder([builderId]);
        expect(tokenId).toBe(BigInt(1));
      });

      it('Reverts if the builderId is not registered', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const invalidBuilderId = uuid();
        await expect(
          builderNftContract.read.getTokenIdForBuilder([invalidBuilderId])
        ).rejects.toThrow('Builder not registered');
      });
    });

    describe('totalBuilderTokens()', function () {
      it('Returns the total number of registered builder tokens', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        let totalBuilderTokens = await builderNftContract.read.totalBuilderTokens();
        expect(totalBuilderTokens).toBe(BigInt(0));

        const builderId1 = uuid();
        const builderId2 = uuid();
        await builderNftContract.write.registerBuilderToken([builderId1]);
        await builderNftContract.write.registerBuilderToken([builderId2]);

        totalBuilderTokens = await builderNftContract.read.totalBuilderTokens();
        expect(totalBuilderTokens).toBe(BigInt(2));
      });
    });

    describe('getPriceIncrement()', function () {
      it('Returns the price increment used for calculating token prices', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const priceIncrement = await builderNftContract.read.getPriceIncrement();
        expect(priceIncrement).toBeGreaterThan(BigInt(0));
      });
    });

    describe('uri()', function () {
      it('Returns the correct URI for a given tokenId', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const tokenId = BigInt(1);
        const uri = await builderNftContract.read.uri([tokenId]);

        const expectedUri = `https://nft.scoutgame.xyz/seasons/2024-W40/beta/${tokenId}/artwork.png`;
        expect(uri).toBe(expectedUri);
      });
    });

    describe('tokenURI()', function () {
      it('Returns the correct token URI for a given tokenId', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const tokenId = BigInt(1);
        const uri = await builderNftContract.read.tokenURI([tokenId]);

        const expectedUri = `https://nft.scoutgame.xyz/seasons/2024-W40/beta/${tokenId}/artwork.png`;
        expect(uri).toBe(expectedUri);
      });
    });

    describe('isValidUUID()', function () {
      it('Returns true for valid UUIDs', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const isValid = await builderNftContract.read.isValidUUID([validUuid]);
        expect(isValid).toBe(true);
      });

      it('Returns false for invalid UUIDs', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const invalidUuid = 'invalid-uuid-string';
        const isValid = await builderNftContract.read.isValidUUID([invalidUuid]);
        expect(isValid).toBe(false);
      });
    });
  });
});