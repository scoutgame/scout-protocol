import { mine, time } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import type { Address } from 'viem';
import { parseEventLogs } from 'viem';

import type { ProtocolTestFixture } from '../../../deployProtocol';
import { deployProtocolContract } from '../../../deployProtocol';
import { deployScoutTokenERC20, type ProtocolERC20TestFixture } from '../../../deployScoutTokenERC20';
import type { WeeklyVestingTestFixture } from '../../../deployWeeklyVesting';
import { deployWeeklyVesting } from '../../../deployWeeklyVesting';
import type { GeneratedWallet } from '../../../generateWallets';
import { walletFromKey } from '../../../generateWallets';

async function createStream({
  erc20,
  recipient,
  vesting,
  amountToVest,
  streamCreator,
  weeks,
  startDate
}: {
  erc20: ProtocolERC20TestFixture;
  recipient: Address;
  vesting: WeeklyVestingTestFixture;
  streamCreator: GeneratedWallet;
  amountToVest: number;
  weeks: number;
  startDate?: number | bigint;
}) {
  await erc20.approveProtocolERC20({
    args: { spender: vesting.WeeklyERC20Vesting.address, amount: amountToVest },
    wallet: streamCreator
  });

  const latest = await time.latest();

  const receipt = await vesting.WeeklyERC20Vesting.write.createStream(
    [
      recipient,
      BigInt(amountToVest) * erc20.ProtocolERC20_DECIMAL_MULTIPLIER,
      typeof startDate === 'bigint' ? startDate : startDate ? BigInt(startDate) : BigInt(latest + 1000),
      BigInt(weeks)
    ],
    {
      account: streamCreator.account
    }
  );

  const output = await streamCreator.getTransactionReceipt({ hash: receipt });

  const streamLog = parseEventLogs({
    abi: vesting.SablierLockupTranched.abi,
    logs: output.logs,
    eventName: ['CreateLockupTranchedStream']
  });

  return streamLog[0];
}

describe('LockupWeeklyStreamCreator', () => {
  let erc20: ProtocolERC20TestFixture;
  let protocol: ProtocolTestFixture;
  let vesting: WeeklyVestingTestFixture;
  let streamCreator: GeneratedWallet;

  beforeEach(async () => {
    erc20 = await deployScoutTokenERC20();
    vesting = await deployWeeklyVesting({
      ScoutERC20Address: erc20.ProtocolERC20.address
    });
    protocol = await deployProtocolContract({
      ProtocolERC20Address: erc20.ProtocolERC20.address
    });
    streamCreator = await walletFromKey();
  });

  describe('createStream()', () => {
    describe('effects', () => {
      it('creates a claimable, and cancellable stream for the protocol', async () => {
        const { WeeklyERC20Vesting, SablierLockupTranched } = vesting;

        const recipient = await walletFromKey();

        // Fund the stream creator with some tokens
        await erc20.fundWallet({
          account: streamCreator.account.address,
          amount: 200_000
        });

        const amountToVest = 100_000;
        const totalWeeks = 10;

        // Approve the contract
        await erc20.approveProtocolERC20({
          args: { spender: WeeklyERC20Vesting.address, amount: amountToVest },
          wallet: streamCreator
        });

        const latest = await time.latest();

        const receipt = await WeeklyERC20Vesting.write.createStream(
          [
            recipient.account.address,
            BigInt(amountToVest) * erc20.ProtocolERC20_DECIMAL_MULTIPLIER,
            BigInt(latest + 1000),
            BigInt(totalWeeks)
          ],
          {
            account: streamCreator.account
          }
        );

        const output = await streamCreator.getTransactionReceipt({ hash: receipt });

        const streamLog = parseEventLogs({
          abi: SablierLockupTranched.abi,
          logs: output.logs,
          eventName: ['CreateLockupTranchedStream']
        });

        expect(streamLog).toHaveLength(1);
        expect(streamLog[0].eventName).toEqual('CreateLockupTranchedStream');
        expect(streamLog[0].args.recipient).toEqual(recipient.account.address);
        expect(streamLog[0].args.sender).toEqual(streamCreator.account.address);
        expect(streamLog[0].args.amounts.deposit).toEqual(
          BigInt(amountToVest) * erc20.ProtocolERC20_DECIMAL_MULTIPLIER
        );
        expect(streamLog[0].args.cancelable).toEqual(true);
      });

      it('immediately deducts the balance from the stream creator', async () => {
        await erc20.fundWallet({
          account: streamCreator.account.address,
          amount: 200_000
        });

        await createStream({
          erc20,
          recipient: streamCreator.account.address,
          vesting,
          amountToVest: 100_000,
          streamCreator,
          weeks: 10
        });

        const balance = await erc20.balanceOfProtocolERC20({
          account: streamCreator.account.address
        });

        expect(balance).toBe(100_000);
      });
    });
  });

  describe('claim()', () => {
    describe('effects', () => {
      it('allows the recipient to claim the stream, unlocked in weekly increments', async () => {
        const recipient = await walletFromKey();

        // Fund the stream creator with some tokens
        await erc20.fundWallet({
          account: streamCreator.account.address,
          amount: 200_000
        });

        const amountToVest = 100_000;

        const totalWeeks = 10;

        const perTranche = amountToVest / totalWeeks;

        const startDate = vesting.nowIshInSeconds() + BigInt(1000);

        const stream = await createStream({
          erc20,
          recipient: recipient.account.address,
          vesting,
          amountToVest,
          streamCreator,
          weeks: totalWeeks,
          startDate
        });

        for (let i = 0; i < totalWeeks; i++) {
          expect(stream.args.tranches[i].amount).toBe(BigInt(perTranche) * erc20.ProtocolERC20_DECIMAL_MULTIPLIER);
          expect(stream.args.tranches[i].timestamp).toBe(Number(startDate) + i * 60 * 60 * 24 * 7);
        }

        const recipientBalance = await erc20.balanceOfProtocolERC20({
          account: recipient.account.address
        });

        expect(recipientBalance).toBe(0);

        for (let i = 0; i < totalWeeks; i++) {
          await time.setNextBlockTimestamp(stream.args.tranches[i].timestamp);

          await mine();

          await vesting.WeeklyERC20Vesting.write.claim([stream.args.streamId], {
            account: recipient.account
          });

          const recipientBalanceAfterClaim = await erc20.balanceOfProtocolERC20({
            account: recipient.account.address
          });

          expect(recipientBalanceAfterClaim).toBe(perTranche * (i + 1));
        }
      });

      it('allows the protocol contract to receive a stream, unlocked in weekly increments by any wallet', async () => {
        const { ScoutProtocolProxyContract } = protocol;

        const operator = await walletFromKey();

        // Fund the stream creator with some tokens
        await erc20.fundWallet({
          account: streamCreator.account.address,
          amount: 200_000
        });

        const amountToVest = 100_000;

        const totalWeeks = 10;

        const perTranche = amountToVest / totalWeeks;

        const stream = await createStream({
          erc20,
          recipient: ScoutProtocolProxyContract.address,
          vesting,
          amountToVest,
          streamCreator,
          weeks: totalWeeks
        });

        const recipientBalance = await erc20.balanceOfProtocolERC20({
          account: ScoutProtocolProxyContract.address
        });

        expect(recipientBalance).toBe(0);

        for (let i = 0; i < totalWeeks; i++) {
          await time.setNextBlockTimestamp(stream.args.tranches[i].timestamp);

          await mine();

          await vesting.WeeklyERC20Vesting.write.claim([stream.args.streamId], {
            account: operator.account
          });

          const recipientBalanceAfterClaim = await erc20.balanceOfProtocolERC20({
            account: ScoutProtocolProxyContract.address
          });

          expect(recipientBalanceAfterClaim).toBe(perTranche * (i + 1));
        }
      });
    });
  });

  describe('(SablierLockupTranched) cancel()', () => {
    describe('effects', () => {
      it('allows the stream creator to cancel the stream and receive a refund for the remaining assets', async () => {
        const recipient = await walletFromKey();

        // Fund the stream creator with some tokens
        await erc20.fundWallet({
          account: streamCreator.account.address,
          amount: 200_000
        });

        const amountToVest = 100_000;

        const totalWeeks = 10;

        const perTranche = amountToVest / totalWeeks;

        const startDate = (await time.latest()) + 1000;

        const stream = await createStream({
          erc20,
          recipient: recipient.account.address,
          vesting,
          amountToVest,
          streamCreator,
          weeks: totalWeeks,
          startDate
        });

        for (let i = 0; i < totalWeeks; i++) {
          expect(stream.args.tranches[i].amount).toBe(BigInt(perTranche) * erc20.ProtocolERC20_DECIMAL_MULTIPLIER);
          expect(stream.args.tranches[i].timestamp).toBe(Number(startDate) + i * 60 * 60 * 24 * 7);
        }

        const recipientBalance = await erc20.balanceOfProtocolERC20({
          account: recipient.account.address
        });

        expect(recipientBalance).toBe(0);

        const claimedWeeks = 3;

        for (let i = 0; i < claimedWeeks; i++) {
          await time.setNextBlockTimestamp(stream.args.tranches[i].timestamp);

          await mine();

          await vesting.WeeklyERC20Vesting.write.claim([stream.args.streamId], {
            account: recipient.account
          });

          const recipientBalanceAfterClaim = await erc20.balanceOfProtocolERC20({
            account: recipient.account.address
          });

          expect(recipientBalanceAfterClaim).toBe(perTranche * (i + 1));
        }

        const expectedRefund = perTranche * (totalWeeks - claimedWeeks);

        const streamCreatorBalanceBeforeCancel = await erc20.balanceOfProtocolERC20({
          account: streamCreator.account.address
        });

        // Call the actual contract
        await vesting.SablierLockupTranched.write.cancel([stream.args.streamId], {
          account: streamCreator.account
        });

        const streamCreatorBalanceAfterCancel = await erc20.balanceOfProtocolERC20({
          account: streamCreator.account.address
        });

        expect(streamCreatorBalanceAfterCancel).toBe(streamCreatorBalanceBeforeCancel + expectedRefund);
      });
    });
  });
});
