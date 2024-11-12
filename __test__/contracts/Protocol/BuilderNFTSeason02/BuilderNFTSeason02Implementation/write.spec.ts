import { v4 as uuid } from 'uuid';
import { parseEventLogs } from 'viem';

import type { BuilderNftSeason02Fixture } from '../../../../deployBuilderNftSeason02';
import type { ProtocolERC20TestFixture } from '../../../../deployScoutTokenERC20';
import { loadBuilderNFTSeason02Fixtures } from '../../../../fixtures';
import { walletFromKey, type GeneratedWallet } from '../../../../generateWallets';

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
});
