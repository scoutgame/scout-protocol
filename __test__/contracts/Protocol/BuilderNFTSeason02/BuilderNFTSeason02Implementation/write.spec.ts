import { v4 as uuid } from 'uuid';
import { parseEventLogs } from 'viem';

import type { BuilderNftSeason02Fixture } from '../../../../deployBuilderNftSeason02';
import type { ProtocolERC20TestFixture } from '../../../../deployScoutTokenERC20';
import { loadBuilderNFTSeason02Fixtures } from '../../../../fixtures';
import { generateWallets, walletFromKey, type GeneratedWallet } from '../../../../generateWallets';

async function mintNft({
  wallet,
  erc20,
  nft,
  amount,
  tokenId
}: {
  wallet: GeneratedWallet;
  erc20: ProtocolERC20TestFixture;
  nft: BuilderNftSeason02Fixture;
  amount: number;
  tokenId: number;
}) {
  // Get price
  const price = await nft.builderNftContract.read.getTokenPurchasePrice([BigInt(tokenId), BigInt(amount)]);

  // Fund wallet
  await erc20.ProtocolERC20.write.transfer([wallet.account.address, price], {
    account: erc20.ProtocolERC20AdminAccount.account
  });

  // Approve the contract to spend USDC
  await erc20.ProtocolERC20.write.approve([nft.builderNftContract.address, price], {
    account: wallet.account
  });

  // Mint NFT
  await nft.builderNftContract.write.mint([wallet.account.address, BigInt(tokenId), BigInt(amount)], {
    account: wallet.account
  });
}

describe('BuilderNFTSeason02Implementation', function () {
  let token: ProtocolERC20TestFixture;
  let builderNftSeason02: BuilderNftSeason02Fixture;
  let erc20AdminAccount: GeneratedWallet;
  let erc1155AdminAccount: GeneratedWallet;

  let userAccount: GeneratedWallet;
  let proceedsReceiverAccount: GeneratedWallet;

  beforeEach(async () => {
    const fixtures = await loadBuilderNFTSeason02Fixtures();

    token = fixtures.token;
    builderNftSeason02 = fixtures.builderNftSeason02;
    erc20AdminAccount = fixtures.token.ProtocolERC20AdminAccount;
    erc1155AdminAccount = fixtures.builderNftSeason02.builderNftAdminAccount;
    userAccount = await walletFromKey();
  });

  describe('registerBuilderToken()', function () {
    describe('effects', function () {
      it('Register a new builder token using a builderId', async function () {
        const builderId = uuid(); // Sample UUID

        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
            account: erc1155AdminAccount.account
          })
        ).resolves.toBeDefined();

        const tokenId = await builderNftSeason02.builderNftContract.read.getBuilderIdForToken([BigInt(1)]);
        expect(tokenId).toBe(builderId);
      });
    });

    describe('events', function () {
      it('Emits BuilderTokenRegistered event new tokenId and builderId', async function () {
        const builderId = uuid(); // Sample UUID
        const txResponse = await builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
          account: erc1155AdminAccount.account
        });

        // Extract logs and parse events
        const receipt = await userAccount.getTransactionReceipt({ hash: txResponse });

        const parsedLogs = parseEventLogs({
          abi: builderNftSeason02.builderNftContract.abi,
          logs: receipt.logs,
          eventName: ['BuilderTokenRegistered']
        });

        const decodedEvent = parsedLogs.find((log) => log.eventName === 'BuilderTokenRegistered');

        expect(decodedEvent).toBeDefined();

        expect(decodedEvent!.args.tokenId).toEqual(BigInt(1));
        expect(decodedEvent!.args.builderId).toEqual(builderId);
      });
    });

    describe('permissions', function () {
      it('Normal users cannot register a builder token', async function () {
        const builderId = uuid();
        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
            account: userAccount.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });

      it('Minter can register a builder token', async function () {
        await builderNftSeason02.builderNftContract.write.setMinter([userAccount.account.address], {
          account: erc1155AdminAccount.account
        });

        const builderId = uuid();

        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();
      });
    });

    describe('validations', function () {
      it('Revert if the builderId is already registered', async function () {
        const builderId = uuid();
        await builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
          account: erc1155AdminAccount.account
        });

        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('Builder already registered');
      });

      it('Revert if the builderId is empty', async function () {
        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken([null as any], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('Builder ID must be a valid UUID');
      });

      it('Revert if the builderId is an invalid uuid', async function () {
        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken([''], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('Builder ID must be a valid UUID');

        await expect(
          builderNftSeason02.builderNftContract.write.registerBuilderToken(['abc'], {
            account: erc1155AdminAccount.account
          })
        ).rejects.toThrow('Builder ID must be a valid UUID');
      });
    });
  });

  describe('mint()', function () {
    describe('effects', function () {
      it('Mints tokens to a user account', async function () {
        // Setup: Register builder token
        const builderId = uuid();
        await builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
          account: erc1155AdminAccount.account
        });

        // Transfer tokens to user to cover mint price
        const mintPrice = await builderNftSeason02.builderNftContract.read.getTokenPurchasePrice([
          BigInt(1),
          BigInt(1)
        ]);
        await token.ProtocolERC20.write.transfer([userAccount.account.address, mintPrice], {
          account: erc20AdminAccount.account
        });

        // Approve NFT contract to spend user's tokens
        await token.ProtocolERC20.write.approve([builderNftSeason02.builderNftContract.address, mintPrice], {
          account: userAccount.account
        });

        await expect(
          builderNftSeason02.builderNftContract.write.mint([userAccount.account.address, BigInt(1), BigInt(1)], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();

        // Check balance
        const balance = await builderNftSeason02.builderNftContract.read.balanceOf([
          userAccount.account.address,
          BigInt(1)
        ]);
        expect(balance).toEqual(BigInt(1));
      });

      it('Mints tokens to a different address than the one paying for the transfer', async function () {
        // Setup: Register builder token
        const builderId = uuid();
        await builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
          account: erc1155AdminAccount.account
        });

        const userReceivingGift = await walletFromKey();

        // Transfer tokens to user to cover mint price
        const mintPrice = await builderNftSeason02.builderNftContract.read.getTokenPurchasePrice([
          BigInt(1),
          BigInt(1)
        ]);
        await token.ProtocolERC20.write.transfer([userAccount.account.address, mintPrice], {
          account: erc20AdminAccount.account
        });

        // Approve NFT contract to spend user's tokens
        await token.ProtocolERC20.write.approve([builderNftSeason02.builderNftContract.address, mintPrice], {
          account: userAccount.account
        });

        await expect(
          builderNftSeason02.builderNftContract.write.mint([userReceivingGift.account.address, BigInt(1), BigInt(1)], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();

        // Check balance
        const balance = await builderNftSeason02.builderNftContract.read.balanceOf([
          userReceivingGift.account.address,
          BigInt(1)
        ]);
        expect(balance).toEqual(BigInt(1));
      });

      it('Increments total supply of the token', async function () {
        const tokenId = 1;

        const totalSupply = await builderNftSeason02.builderNftContract.read.totalSupply([BigInt(tokenId)]);

        expect(totalSupply).toEqual(BigInt(0));

        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId
        });

        const updatedTotalSupply = await builderNftSeason02.builderNftContract.read.totalSupply([BigInt(tokenId)]);

        expect(updatedTotalSupply).toEqual(BigInt(1));

        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 3,
          tokenId
        });

        const finalTotalSupply = await builderNftSeason02.builderNftContract.read.totalSupply([BigInt(tokenId)]);

        expect(finalTotalSupply).toEqual(BigInt(4));
      });
    });

    describe('events', function () {
      it('Emits TransferSingle event on mint', async function () {
        // Setup: Register builder token
        const builderId = uuid();
        await builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
          account: erc1155AdminAccount.account
        });

        const userReceivingGift = await walletFromKey();

        const tokensToBuy = BigInt(22);

        // Transfer tokens to user to cover mint price
        const mintPrice = await builderNftSeason02.builderNftContract.read.getTokenPurchasePrice([
          BigInt(1),
          tokensToBuy
        ]);
        await token.ProtocolERC20.write.transfer([userAccount.account.address, mintPrice], {
          account: erc20AdminAccount.account
        });

        // Approve NFT contract to spend user's tokens
        await token.ProtocolERC20.write.approve([builderNftSeason02.builderNftContract.address, mintPrice], {
          account: userAccount.account
        });

        const txResponse = await builderNftSeason02.builderNftContract.write.mint(
          [userReceivingGift.account.address, BigInt(1), tokensToBuy],
          {
            account: userAccount.account
          }
        );

        const receipt = await userAccount.getTransactionReceipt({ hash: txResponse });

        const transferEvent = parseEventLogs({
          abi: builderNftSeason02.builderNftContract.abi,
          logs: receipt.logs,
          eventName: ['TransferSingle']
        })[0];

        expect(transferEvent).toBeDefined();
        expect(transferEvent!.args.operator).toEqual(userAccount.account.address);
        expect(transferEvent!.args.from).toEqual('0x0000000000000000000000000000000000000000');
        expect(transferEvent!.args.to).toEqual(userReceivingGift.account.address);
        expect(transferEvent!.args.id).toEqual(BigInt(1));
        expect(transferEvent!.args.value).toEqual(tokensToBuy);
      });
    });

    describe('permissions', function () {
      it('Allows any user to mint tokens if they pay the price', async function () {
        // Setup similar to effects test
        const builderId = uuid();
        await builderNftSeason02.builderNftContract.write.registerBuilderToken([builderId], {
          account: erc1155AdminAccount.account
        });

        proceedsReceiverAccount = await walletFromKey();
        await builderNftSeason02.builderNftContract.write.setProceedsReceiver(
          [proceedsReceiverAccount.account.address],
          {
            account: erc1155AdminAccount.account
          }
        );

        const mintPrice = await builderNftSeason02.builderNftContract.read.getTokenPurchasePrice([
          BigInt(1),
          BigInt(1)
        ]);
        await token.ProtocolERC20.write.transfer([userAccount.account.address, mintPrice], {
          account: erc20AdminAccount.account
        });

        await token.ProtocolERC20.write.approve([builderNftSeason02.builderNftContract.address, mintPrice], {
          account: userAccount.account
        });

        await expect(
          builderNftSeason02.builderNftContract.write.mint([userAccount.account.address, BigInt(1), BigInt(1)], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();
      });
    });

    describe('validations', function () {
      it('Reverts if tokenId is not registered', async function () {
        const unregisteredTokenId = BigInt(999);

        await expect(
          builderNftSeason02.builderNftContract.write.mint(
            [userAccount.account.address, unregisteredTokenId, BigInt(1)],
            { account: userAccount.account }
          )
        ).rejects.toThrow();
      });
    });
  });

  describe('burn()', function () {
    describe('effects', function () {
      it('Burns tokens from a user account', async function () {
        // Mint tokens first
        // Setup similar to mint test
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });

        // Burn tokens
        await expect(
          builderNftSeason02.builderNftContract.write.burn([userAccount.account.address, BigInt(1), BigInt(1)], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();

        // Check balance
        const balance = await builderNftSeason02.builderNftContract.read.balanceOf([
          userAccount.account.address,
          BigInt(1)
        ]);
        expect(balance).toEqual(BigInt(0));
      });

      it('Decrements total supply of the token', async function () {
        const tokenId = 1;

        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 5,
          tokenId
        });

        const totalSupply = await builderNftSeason02.builderNftContract.read.totalSupply([BigInt(tokenId)]);

        expect(totalSupply).toEqual(BigInt(5));

        await builderNftSeason02.builderNftContract.write.burn(
          [userAccount.account.address, BigInt(tokenId), BigInt(2)],
          {
            account: userAccount.account
          }
        );

        const updatedTotalSupply = await builderNftSeason02.builderNftContract.read.totalSupply([BigInt(tokenId)]);

        expect(updatedTotalSupply).toEqual(BigInt(3));
      });
    });

    describe('events', function () {
      it('Emits TransferSingle event on burn', async function () {
        // Mint tokens first
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });

        // Burn tokens
        const txResponse = await builderNftSeason02.builderNftContract.write.burn(
          [userAccount.account.address, BigInt(1), BigInt(1)],
          { account: userAccount.account }
        );

        const receipt = await userAccount.getTransactionReceipt({ hash: txResponse });

        const parsedLogs = parseEventLogs({
          abi: builderNftSeason02.builderNftContract.abi,
          logs: receipt.logs,
          eventName: ['TransferSingle']
        });

        const transferEvent = parsedLogs.find((log) => log.eventName === 'TransferSingle');

        expect(transferEvent).toBeDefined();
        expect(transferEvent!.args.operator).toEqual(userAccount.account.address);
        expect(transferEvent!.args.from).toEqual(userAccount.account.address);
        expect(transferEvent!.args.to).toEqual('0x0000000000000000000000000000000000000000');
        expect(transferEvent!.args.id).toEqual(BigInt(1));
        expect(transferEvent!.args.value).toEqual(BigInt(1));

        // Check balance
        const balance = await builderNftSeason02.builderNftContract.read.balanceOf([
          userAccount.account.address,
          BigInt(1)
        ]);
        expect(balance).toEqual(BigInt(1));
      });
    });

    describe('permissions', function () {
      it('Allows token owner to burn tokens', async function () {
        const tokenId = 1;

        // Mint tokens first
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId
        });

        // Burn tokens
        await expect(
          builderNftSeason02.builderNftContract.write.burn([userAccount.account.address, BigInt(1), BigInt(1)], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();
      });

      it('Allows approved operator to burn tokens', async function () {
        const tokenId = 1;

        // Mint tokens first
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId
        });

        // Approve operator
        const operatorAccount = await walletFromKey();
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Burn tokens as operator
        await expect(
          builderNftSeason02.builderNftContract.write.burn([userAccount.account.address, BigInt(1), BigInt(1)], {
            account: operatorAccount.account
          })
        ).resolves.toBeDefined();
      });

      it('Prevents burning tokens if not owner nor approved', async function () {
        const tokenId = 1;

        // Mint tokens first
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId
        });

        // Attempt to burn without approval
        const anotherAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.burn([userAccount.account.address, BigInt(1), BigInt(1)], {
            account: anotherAccount.account
          })
        ).rejects.toThrow('ERC1155: caller is not owner nor approved');
      });
    });

    describe('validations', function () {
      it('Reverts if burning more tokens than balance', async function () {
        // Attempt to burn more than balance
        await expect(
          builderNftSeason02.builderNftContract.write.burn([userAccount.account.address, BigInt(1), BigInt(2)], {
            account: userAccount.account
          })
        ).rejects.toThrow('Cannot decrease balance below 0');
      });
    });
  });

  describe('setApprovalForAll()', function () {
    describe('effects', function () {
      it('Sets operator approval for the caller', async function () {
        const operatorAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();

        const isApproved = await builderNftSeason02.builderNftContract.read.isApprovedForAll([
          userAccount.account.address,
          operatorAccount.account.address
        ]);
        expect(isApproved).toEqual(true);
      });
    });

    describe('events', function () {
      it('Emits ApprovalForAll event', async function () {
        const operatorAccount = await walletFromKey();

        const txResponse = await builderNftSeason02.builderNftContract.write.setApprovalForAll(
          [operatorAccount.account.address, true],
          { account: userAccount.account }
        );

        const receipt = await userAccount.getTransactionReceipt({ hash: txResponse });

        const parsedLogs = parseEventLogs({
          abi: builderNftSeason02.builderNftContract.abi,
          logs: receipt.logs,
          eventName: ['ApprovalForAll']
        });

        const approvalEvent = parsedLogs.find((log) => log.eventName === 'ApprovalForAll');

        expect(approvalEvent).toBeDefined();
        expect(approvalEvent!.args.account).toEqual(userAccount.account.address);
        expect(approvalEvent!.args.operator).toEqual(operatorAccount.account.address);
        expect(approvalEvent!.args.approved).toEqual(true);
      });
    });

    describe('permissions', function () {
      it('Allows any user to set operator approval', async function () {
        const operatorAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();
      });
    });

    describe('validations', function () {
      it('Reverts if setting approval for self', async function () {
        await expect(
          builderNftSeason02.builderNftContract.write.setApprovalForAll([userAccount.account.address, true], {
            account: userAccount.account
          })
        ).rejects.toThrow('ERC1155: setting approval status for self');
      });
    });
  });

  describe('safeTransferFrom()', function () {
    describe('effects', function () {
      it('Transfers tokens from one account to another', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });

        // Approve operator
        const operatorAccount = await walletFromKey();
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Transfer tokens
        const recipientAccount = await walletFromKey();
        await expect(
          builderNftSeason02.builderNftContract.write.safeTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(1), '0x'],
            { account: operatorAccount.account }
          )
        ).resolves.toBeDefined();

        // Check balances
        const senderBalance = await builderNftSeason02.builderNftContract.read.balanceOf([
          userAccount.account.address,
          BigInt(1)
        ]);
        expect(senderBalance).toEqual(BigInt(0));

        const recipientBalance = await builderNftSeason02.builderNftContract.read.balanceOf([
          recipientAccount.account.address,
          BigInt(1)
        ]);
        expect(recipientBalance).toEqual(BigInt(1));
      });
    });

    describe('events', function () {
      it('Emits TransferSingle event on transfer', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });

        // Setup similar to effects test
        const { userAccount: recipientAccount, secondUserAccount: operatorAccount } = await generateWallets();

        // Approve operator
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Perform transfer
        const txResponse = await builderNftSeason02.builderNftContract.write.safeTransferFrom(
          [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(1), '0x'],
          { account: operatorAccount.account }
        );

        const receipt = await operatorAccount.getTransactionReceipt({ hash: txResponse });

        const parsedLogs = parseEventLogs({
          abi: builderNftSeason02.builderNftContract.abi,
          logs: receipt.logs,
          eventName: ['TransferSingle']
        });

        const transferEvent = parsedLogs.find((log) => log.eventName === 'TransferSingle');

        expect(transferEvent).toBeDefined();
        expect(transferEvent!.args.operator).toEqual(operatorAccount.account.address);
        expect(transferEvent!.args.from).toEqual(userAccount.account.address);
        expect(transferEvent!.args.to).toEqual(recipientAccount.account.address);
        expect(transferEvent!.args.id).toEqual(BigInt(1));
        expect(transferEvent!.args.value).toEqual(BigInt(1));
      });
    });

    describe('permissions', function () {
      it('Allows token owner to transfer tokens', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });
        // Setup similar to mint test

        // Transfer tokens
        const recipientAccount = await walletFromKey();
        await expect(
          builderNftSeason02.builderNftContract.write.safeTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(1), '0x'],
            { account: userAccount.account }
          )
        ).resolves.toBeDefined();
      });

      it('Allows approved operator to transfer tokens', async function () {
        // Setup similar to previous test
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });

        // Approve operator
        const operatorAccount = await walletFromKey();
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Transfer tokens
        const recipientAccount = await walletFromKey();
        await expect(
          builderNftSeason02.builderNftContract.write.safeTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(1), '0x'],
            { account: operatorAccount.account }
          )
        ).resolves.toBeDefined();
      });

      it('Prevents transferring tokens if not owner nor approved', async function () {
        // Setup similar to mint test
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });

        // Attempt transfer without approval
        const anotherAccount = await walletFromKey();
        const recipientAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.safeTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(1), '0x'],
            { account: anotherAccount.account }
          )
        ).rejects.toThrow('ERC1155: caller is not owner nor approved');
      });
    });

    describe('validations', function () {
      it('Reverts if caller is not owner nor approved', async function () {
        // Mint tokens to userAccount
        // Setup similar to mint test

        // Attempt transfer without approval
        const anotherAccount = await walletFromKey();
        const recipientAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.safeTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(1), '0x'],
            { account: anotherAccount.account }
          )
        ).rejects.toThrow('ERC1155: caller is not owner nor approved');
      });

      it('Reverts if transferring more tokens than balance', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 1,
          tokenId: 1
        });

        // Attempt to transfer more than balance
        const recipientAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.safeTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, BigInt(1), BigInt(2), '0x'],
            { account: userAccount.account }
          )
        ).rejects.toThrow('ERC1155: insufficient balance for transfer');
      });
    });
  });

  describe('safeBatchTransferFrom()', function () {
    describe('effects', function () {
      it('Transfers multiple tokens from one account to another', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });

        // Approve operator
        const operatorAccount = await walletFromKey();
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Transfer tokens
        const recipientAccount = await walletFromKey();
        await expect(
          builderNftSeason02.builderNftContract.write.safeBatchTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, [BigInt(1)], [BigInt(1)], '0x'],
            { account: operatorAccount.account }
          )
        ).resolves.toBeDefined();

        // Check balances
        const senderBalance = await builderNftSeason02.builderNftContract.read.balanceOf([
          userAccount.account.address,
          BigInt(1)
        ]);
        expect(senderBalance).toEqual(BigInt(1));

        const recipientBalance = await builderNftSeason02.builderNftContract.read.balanceOf([
          recipientAccount.account.address,
          BigInt(1)
        ]);
        expect(recipientBalance).toEqual(BigInt(1));
      });
    });

    describe('events', function () {
      it('Emits TransferBatch event on transfer', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });

        // Setup similar to effects test
        const { userAccount: recipientAccount, secondUserAccount: operatorAccount } = await generateWallets();

        // Approve operator
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Perform transfer
        const txResponse = await builderNftSeason02.builderNftContract.write.safeBatchTransferFrom(
          [userAccount.account.address, recipientAccount.account.address, [BigInt(1)], [BigInt(1)], '0x'],
          { account: operatorAccount.account }
        );

        const receipt = await operatorAccount.getTransactionReceipt({ hash: txResponse });

        const parsedLogs = parseEventLogs({
          abi: builderNftSeason02.builderNftContract.abi,
          logs: receipt.logs,
          eventName: ['TransferBatch']
        });

        const transferEvent = parsedLogs.find((log) => log.eventName === 'TransferBatch');

        expect(transferEvent).toBeDefined();

        expect(transferEvent!.args.operator).toEqual(operatorAccount.account.address);
        expect(transferEvent!.args.from).toEqual(userAccount.account.address);
        expect(transferEvent!.args.to).toEqual(recipientAccount.account.address);
        expect(transferEvent!.args.ids).toEqual([BigInt(1)]);
        expect(transferEvent!.args.values).toEqual([BigInt(1)]);
      });
    });

    describe('permissions', function () {
      it('Allows token owner to transfer tokens', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });
        // Setup similar to mint test

        // Transfer tokens
        const recipientAccount = await walletFromKey();
        await expect(
          builderNftSeason02.builderNftContract.write.safeBatchTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, [BigInt(1)], [BigInt(1)], '0x'],
            { account: userAccount.account }
          )
        ).resolves.toBeDefined();
      });

      it('Allows approved operator to transfer tokens', async function () {
        // Setup similar to previous test
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });

        // Approve operator
        const operatorAccount = await walletFromKey();
        await builderNftSeason02.builderNftContract.write.setApprovalForAll([operatorAccount.account.address, true], {
          account: userAccount.account
        });

        // Transfer tokens
        const recipientAccount = await walletFromKey();
        await expect(
          builderNftSeason02.builderNftContract.write.safeBatchTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, [BigInt(1)], [BigInt(1)], '0x'],
            { account: operatorAccount.account }
          )
        ).resolves.toBeDefined();
      });

      it('Prevents transferring tokens if not owner nor approved', async function () {
        // Setup similar to mint test
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });

        // Attempt transfer without approval
        const anotherAccount = await walletFromKey();
        const recipientAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.safeBatchTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, [BigInt(1)], [BigInt(1)], '0x'],
            { account: anotherAccount.account }
          )
        ).rejects.toThrow('ERC1155: caller is not owner nor approved');
      });
    });

    describe('validations', function () {
      it('Reverts if transferring more tokens than balance', async function () {
        // Mint tokens to userAccount
        await mintNft({
          wallet: userAccount,
          erc20: token,
          nft: builderNftSeason02,
          amount: 2,
          tokenId: 1
        });

        // Attempt to transfer more than balance
        const recipientAccount = await walletFromKey();

        await expect(
          builderNftSeason02.builderNftContract.write.safeBatchTransferFrom(
            [userAccount.account.address, recipientAccount.account.address, [BigInt(1)], [BigInt(3)], '0x'],
            { account: userAccount.account }
          )
        ).rejects.toThrow('ERC1155: insufficient balance for transfer');
      });
    });
  });

  describe('setBaseUri()', function () {
    const newBaseUri = 'https://newbase.uri';
    const uriSuffix = 'metadata.json';
    describe('effects', function () {
      it('Updates the base URI when called with a valid newBaseUri', async function () {
        await expect(
          builderNftSeason02.builderNftContract.write.setBaseUri([newBaseUri, uriSuffix], {
            account: erc1155AdminAccount.account
          })
        ).resolves.toBeDefined();

        const uri = await builderNftSeason02.builderNftContract.read.uri([BigInt(1)]);
        expect(uri).toEqual(`${newBaseUri}/${1}/${uriSuffix}`);
      });
    });

    describe('permissions', function () {
      it('Only admin can set the base URI', async function () {
        await expect(
          builderNftSeason02.builderNftContract.write.setBaseUri([newBaseUri, uriSuffix], {
            account: userAccount.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });
  });
});
