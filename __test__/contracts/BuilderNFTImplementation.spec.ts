import { getAddress, parseEventLogs } from "viem";
import { loadContractFixtures } from "../fixtures";
import { generateWallets } from "../generateWallets";
import { v4 as uuid } from 'uuid';

describe('BuilderNFTImplementation.sol', function () {
  describe('write', function () {
    describe('registerBuilderToken()', function () {
      describe('effects', function () {
        it('Register a new builder token using a builderId', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const builderId = uuid(); // Sample UUID
          await expect(builderNftContract.write.registerBuilderToken([builderId])).resolves.toBeDefined();

          const tokenId = await builderNftContract.read.getBuilderIdForToken([BigInt(1)]);
          expect(tokenId).toBe(builderId);
        });
      });

      describe('events', function () {
        it('Emits BuilderTokenRegistered event new tokenId and builderId', async function () {
          const { builderNft: { builderNftContract, builderNftAdminAccount: account } } = await loadContractFixtures();
      
          const builderId = uuid(); // Sample UUID
          const txResponse = await builderNftContract.write.registerBuilderToken([builderId]);
      
          // Extract logs and parse events
          const receipt = await account.getTransactionReceipt({hash: txResponse});

          const parsedLogs = parseEventLogs({ abi: builderNftContract.abi, logs: receipt.logs, eventName: ['BuilderTokenRegistered'] });

          const decodedEvent = parsedLogs.find((log) => log.eventName === 'BuilderTokenRegistered');

          expect(decodedEvent).toBeDefined();

          expect(decodedEvent!.args.tokenId).toEqual(BigInt(1));
          expect(decodedEvent!.args.builderId).toEqual(builderId);
        });
      });

      describe('permissions', function () {
        it('Only admin can register a builder token', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const { userAccount } = await generateWallets();

          const builderId = uuid();
          await expect(
            builderNftContract.write.registerBuilderToken([builderId], { account: userAccount.account })
          ).rejects.toThrow('Proxy: caller is not the admin');
        });
      });

      describe('validations', function () {
        it('Revert if the builderId is already registered', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          await expect(builderNftContract.write.registerBuilderToken([builderId])).rejects.toThrow(
            'Builder already registered'
          );
        });

        it('Revert if the builderId is empty', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          await expect(builderNftContract.write.registerBuilderToken([null as any])).rejects.toThrow(
            'Builder ID must be a valid UUID'
          );
        });

        it('Revert if the builderId is an invalid uuid', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          await expect(builderNftContract.write.registerBuilderToken([''])).rejects.toThrow(
            'Builder ID must be a valid UUID'
          );
        });
      });
    });

    describe('mint()', function () {
      describe('effects', function () {
        it('Accept USDC and mint the requested amount of tokens for an NFT', async function () {
          const {
            builderNft: { builderNftContract },
            usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
          } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();

          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();

          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          await mintUSDCTo({
            account: secondUserAccount.account.address,
            amount: Number(price / USDC_DECIMALS_MULTIPLIER),
          });

          await approveUSDC({
            wallet: secondUserAccount,
            args: { spender: builderNftContract.address, amount: Number(price) },
          });

          await expect(
            builderNftContract.write.mint([testUserAddress, BigInt(1), BigInt(10), scoutId], {
              account: secondUserAccount.account,
            })
          ).resolves.toBeDefined();

          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(10));
        });
      });

      describe('events', function () {
        it('Emits standard ERC1155 "TransferSingle" event', async function () {
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
      
          const txResponse = await builderNftContract.write.mint(
            [testUserAddress, tokenId, amount, scoutId],
            { account: secondUserAccount.account }
          );
      
          // Extract logs and parse events
          const receipt = await secondUserAccount.getTransactionReceipt({ hash: txResponse });
      
          const parsedLogs = parseEventLogs({
            abi: builderNftContract.abi,
            logs: receipt.logs,
            eventName: ['TransferSingle'],
          });
      
          // Check for TransferSingle event
          const transferEvent = parsedLogs.find((log) => log.eventName === 'TransferSingle');
          expect(transferEvent).toBeDefined();
      
          expect(transferEvent!.args.operator).toEqual(getAddress(secondUserAccount.account.address));
          expect(transferEvent!.args.from).toEqual('0x0000000000000000000000000000000000000000');
          expect(transferEvent!.args.to).toEqual(getAddress(testUserAddress));
          expect(transferEvent!.args.id).toEqual(tokenId);
          expect(transferEvent!.args.value).toEqual(amount);
        });
      
        it('Emits BuilderScouted event with tokenId (number), amount of tokens purchased (), and scoutId (uuid)', async function () {
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
      
          const txResponse = await builderNftContract.write.mint(
            [testUserAddress, tokenId, amount, scoutId],
            { account: secondUserAccount.account }
          );
      
          // Extract logs and parse events
          const receipt = await secondUserAccount.getTransactionReceipt({ hash: txResponse });
      
          const parsedLogs = parseEventLogs({
            abi: builderNftContract.abi,
            logs: receipt.logs,
            eventName: ['BuilderScouted'],
          });
      
          // Check for BuilderScouted event
          const scoutedEvent = parsedLogs.find((log) => log.eventName === 'BuilderScouted');
          expect(scoutedEvent).toBeDefined();
      
          expect(scoutedEvent!.args.tokenId).toEqual(tokenId);
          expect(scoutedEvent!.args.amount).toEqual(amount);
          expect(scoutedEvent!.args.scout).toEqual(scoutId);
        });
      });

      describe('permissions', function () {
        it('Should revert if the caller has not provided USDC allowance to the contract', async function () {
          const {
            builderNft: { builderNftContract },
            usdc: { mintUSDCTo, USDC_DECIMALS_MULTIPLIER },
          } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();

          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();

          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          await mintUSDCTo({
            account: secondUserAccount.account.address,
            amount: Number(price / USDC_DECIMALS_MULTIPLIER),
          });

          // Skip approval
          await expect(
            builderNftContract.write.mint([testUserAddress, BigInt(1), BigInt(10), scoutId], {
              account: secondUserAccount.account,
            })
          ).rejects.toThrow('ERC20: transfer amount exceeds allowance');

          // Check balance unchanged
          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(0));
        });
      });

      describe('validations', function () {
        it("Revert if the caller's USDC balance is insufficent", async function () {
          const {
            builderNft: { builderNftContract },
            usdc: { approveUSDC },
          } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();

          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();

          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          // Important to still approve USDC, even if we don't have the balance to differentiate error messages
          await approveUSDC({
            wallet: secondUserAccount,
            args: { spender: builderNftContract.address, amount: Number(price) },
          });

          await expect(
            builderNftContract.write.mint([testUserAddress, BigInt(1), BigInt(10), scoutId], {
              account: secondUserAccount.account,
            })
          ).rejects.toThrow('ERC20: transfer amount exceeds balance');

          // Check balance unchanged
          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(0));
        });
      });
    });

    describe('setBaseUri()', function () {
      describe('effects', function () {
        it('Updates the base URI when called with a valid newBaseUri', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const newBaseUri = 'https://newbase.uri/';
          await expect(builderNftContract.write.setBaseUri([newBaseUri])).resolves.toBeDefined();

          // Since there's no getter for baseUri, we assume the call succeeds.
        });
      });

      describe('permissions', function () {
        it('Only admin can set the base URI', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const { userAccount } = await generateWallets();

          const newBaseUri = 'https://newbase.uri/';
          await expect(
            builderNftContract.write.setBaseUri([newBaseUri], { account: userAccount.account })
          ).rejects.toThrow('Proxy: caller is not the admin');
        });
      });

      describe('validations', function () {
        it('Reverts when called with an empty newBaseUri', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          await expect(builderNftContract.write.setBaseUri([''])).rejects.toThrow('Empty base URI not allowed');
        });
      });
    });

    describe('burn()', function () {
      describe('effects', function () {
        it('Burns the specified amount of tokens from the account, updating holder balance and total supply of a tokenID', async function () {
          const {
            builderNft: { builderNftContract },
            usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
          } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();
          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          await mintUSDCTo({
            account: testUserAddress,
            amount: Number(price / USDC_DECIMALS_MULTIPLIER),
          });
          await approveUSDC({
            wallet: secondUserAccount,
            args: { spender: builderNftContract.address, amount: Number(price) },
          });

          // Mint tokens to the user
          await builderNftContract.write.mint(
            [testUserAddress, BigInt(1), BigInt(10), scoutId],
            { account: secondUserAccount.account }
          );

          const balanceBefore = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balanceBefore).toBe(BigInt(10));

          // Burn tokens from the user (admin call)
          await expect(builderNftContract.write.burn([testUserAddress, BigInt(1), BigInt(5)])).resolves.toBeDefined();

          const balanceAfter = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balanceAfter).toBe(BigInt(5));

          const totalSupply = await builderNftContract.read.totalSupply([BigInt(1)]);
          expect(totalSupply).toBe(BigInt(5));
        });
      });

      // Events tests for 'burn()' method
      describe('events', function () {
        it('Emits TransferSingle event with correct parameters when burning tokens', async function () {
          const {
            builderNft: { builderNftContract, builderNftAdminAccount: account },
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

          // Mint tokens to the user
          await builderNftContract.write.mint(
            [testUserAddress, tokenId, amount, scoutId],
            { account: secondUserAccount.account }
          );

          // Burn tokens from the user (admin call)
          const txResponse = await builderNftContract.write.burn([testUserAddress, tokenId, BigInt(5)]);

          // Extract logs and parse events
          const receipt = await account.getTransactionReceipt({ hash: txResponse });

          const parsedLogs = parseEventLogs({
            abi: builderNftContract.abi,
            logs: receipt.logs,
            eventName: ['TransferSingle'],
          });

          // Check for TransferSingle event
          const burnEvent = parsedLogs.find((log) => log.eventName === 'TransferSingle');
          expect(burnEvent).toBeDefined();

          expect(burnEvent!.args.operator).toEqual(getAddress(account.account.address));
          expect(burnEvent!.args.from).toEqual(getAddress(testUserAddress));
          expect(burnEvent!.args.to).toEqual('0x0000000000000000000000000000000000000000');
          expect(burnEvent!.args.id).toEqual(tokenId);
          expect(burnEvent!.args.value).toEqual(BigInt(5));
        });
      });

      describe('permissions', function () {
        it('Only admin can burn tokens', async function () {
          const {
            builderNft: { builderNftContract },
            usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
          } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();
          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(10)]);

          await mintUSDCTo({
            account: testUserAddress,
            amount: Number(price / USDC_DECIMALS_MULTIPLIER),
          });
          await approveUSDC({
            wallet: secondUserAccount,
            args: { spender: builderNftContract.address, amount: Number(price) },
          });

          // Mint tokens to the user
          await builderNftContract.write.mint(
            [testUserAddress, BigInt(1), BigInt(10), scoutId],
            { account: secondUserAccount.account }
          );

          // Try to burn tokens from non-admin account
          await expect(
            builderNftContract.write.burn([testUserAddress, BigInt(1), BigInt(5)], {
              account: secondUserAccount.account,
            })
          ).rejects.toThrow('Proxy: caller is not the admin');
        });
      });

      describe('validations', function () {
        it('Reverts when trying to burn more tokens than the account has', async function () {
          const {
            builderNft: { builderNftContract },
            usdc: { mintUSDCTo, approveUSDC, USDC_DECIMALS_MULTIPLIER },
          } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();
          const price = await builderNftContract.read.getTokenPurchasePrice([BigInt(1), BigInt(5)]);

          await mintUSDCTo({
            account: testUserAddress,
            amount: Number(price / USDC_DECIMALS_MULTIPLIER),
          });
          await approveUSDC({
            wallet: secondUserAccount,
            args: { spender: builderNftContract.address, amount: Number(price) },
          });

          // Mint tokens to the user
          await builderNftContract.write.mint(
            [testUserAddress, BigInt(1), BigInt(5), scoutId],
            { account: secondUserAccount.account }
          );

          // Try to burn more tokens than the user has
          await expect(
            builderNftContract.write.burn([testUserAddress, BigInt(1), BigInt(10)])
          ).rejects.toThrow('ERC1155: burn amount exceeds balance');
        });
      });
    });

    describe('mintTo()', function () {
      describe('effects', function () {
        it('Mints tokens to the specified account', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();

          // Admin mints tokens to the user
          await expect(
            builderNftContract.write.mintTo([testUserAddress, BigInt(1), BigInt(10), scoutId])
          ).resolves.toBeDefined();

          const balance = await builderNftContract.read.balanceOf([testUserAddress, BigInt(1)]);
          expect(balance).toBe(BigInt(10));
        });
      });

      describe('events', function () {
        it('Emits TransferSingle event with correct parameters', async function () {
          const { builderNft: { builderNftContract, builderNftAdminAccount: account } } = await loadContractFixtures();
      
          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;
      
          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
      
          const scoutId = uuid();
          const tokenId = BigInt(1);
          const amount = BigInt(10);
      
          // Admin mints tokens to the user
          const txResponse = await builderNftContract.write.mintTo([testUserAddress, tokenId, amount, scoutId]);
      
          // Extract logs and parse events
          const receipt = await account.getTransactionReceipt({ hash: txResponse });
      
          const parsedLogs = parseEventLogs({
            abi: builderNftContract.abi,
            logs: receipt.logs,
            eventName: ['TransferSingle'],
          });
      
          // Check for TransferSingle event
          const transferEvent = parsedLogs.find((log) => log.eventName === 'TransferSingle');
          expect(transferEvent).toBeDefined();
      
          expect(transferEvent!.args.operator).toEqual(getAddress(account.account.address));
          expect(transferEvent!.args.from).toEqual('0x0000000000000000000000000000000000000000');
          expect(transferEvent!.args.to).toEqual(getAddress(testUserAddress));
          expect(transferEvent!.args.id).toEqual(tokenId);
          expect(transferEvent!.args.value).toEqual(amount);
        });
      
        it('Emits BuilderScouted event with correct parameters', async function () {
          const { builderNft: { builderNftContract, builderNftAdminAccount: account } } = await loadContractFixtures();
      
          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;
      
          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);
      
          const scoutId = uuid();
          const tokenId = BigInt(1);
          const amount = BigInt(10);
      
          // Admin mints tokens to the user
          const txResponse = await builderNftContract.write.mintTo([testUserAddress, tokenId, amount, scoutId]);
      
          // Extract logs and parse events
          const receipt = await account.getTransactionReceipt({ hash: txResponse });
      
          const parsedLogs = parseEventLogs({
            abi: builderNftContract.abi,
            logs: receipt.logs,
            eventName: ['BuilderScouted'],
          });
      
          // Check for BuilderScouted event
          const scoutedEvent = parsedLogs.find((log) => log.eventName === 'BuilderScouted');
          expect(scoutedEvent).toBeDefined();
      
          expect(scoutedEvent!.args.tokenId).toEqual(tokenId);
          expect(scoutedEvent!.args.amount).toEqual(amount);
          expect(scoutedEvent!.args.scout).toEqual(scoutId);
        });
      });

      describe('permissions', function () {
        it('Only admin can mint tokens to an account', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          const scoutId = uuid();

          // Non-admin tries to mint tokens
          await expect(
            builderNftContract.write.mintTo(
              [testUserAddress, BigInt(1), BigInt(10), scoutId],
              { account: secondUserAccount.account }
            )
          ).rejects.toThrow('Proxy: caller is not the admin');
        });
      });

      describe('validations', function () {
        it('Reverts when called with an invalid scout UUID', async function () {
          const { builderNft: { builderNftContract } } = await loadContractFixtures();

          const { secondUserAccount } = await generateWallets();
          const testUserAddress = secondUserAccount.account.address;

          const builderId = uuid();
          await builderNftContract.write.registerBuilderToken([builderId]);

          // Use an invalid scout UUID
          const invalidScoutId = '';

          await expect(
            builderNftContract.write.mintTo([testUserAddress, BigInt(1), BigInt(10), invalidScoutId])
          ).rejects.toThrow('Scout must be a valid UUID');
        });
      });
    });
  });

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
      it('Returns the correct price for purchasing a given amount of tokens', async function () {
        const { builderNft: { builderNftContract } } = await loadContractFixtures();

        const builderId = uuid();
        await builderNftContract.write.registerBuilderToken([builderId]);

        const tokenId = BigInt(1);
        const amount = BigInt(10);

        const price = await builderNftContract.read.getTokenPurchasePrice([tokenId, amount]);

        expect(price).toBeGreaterThan(BigInt(0));
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