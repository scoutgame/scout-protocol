import { mine, time } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import type { Address } from 'viem';
import { parseEventLogs } from 'viem';

import type { ProtocolTestFixture } from '../../../deployProtocol';
import { deployProtocolContract } from '../../../deployProtocol';
import { deployScoutTokenERC20, type ScoutTokenERC20TestFixture } from '../../../deployScoutTokenERC20';
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
  startDate
}: {
  erc20: ScoutTokenERC20TestFixture;
  recipient: Address;
  vesting: WeeklyVestingTestFixture;
  streamCreator: GeneratedWallet;
  amountToVest: number;
  weeks: number;
  startDate?: number | bigint;
}) {
  await erc20.approveScoutTokenERC20({
    args: { spender: vesting.WeeklyERC20Vesting.address, amount: amountToVest },
    wallet: streamCreator
  });

  const latest = await time.latest();

  const receipt = await vesting.WeeklyERC20Vesting.write.createStream(
    [
      recipient,
      BigInt(amountToVest) * erc20.ScoutTokenERC20_DECIMAL_MULTIPLIER,
      typeof startDate === 'bigint' ? startDate : startDate ? BigInt(startDate) : BigInt(latest + 1000)
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
  let erc20: ScoutTokenERC20TestFixture;
  let protocol: ProtocolTestFixture;
  let vesting: WeeklyVestingTestFixture;
  let streamCreator: GeneratedWallet;

  beforeEach(async () => {
    erc20 = await deployScoutTokenERC20();
    vesting = await deployWeeklyVesting({
      ScoutERC20Address: erc20.ScoutTokenERC20.address
    });
    protocol = await deployProtocolContract({
      ScoutTokenERC20Address: erc20.ScoutTokenERC20.address
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

        // Approve the contract
        await erc20.approveScoutTokenERC20({
          args: { spender: WeeklyERC20Vesting.address, amount: amountToVest },
          wallet: streamCreator
        });

        const latest = await time.latest();

        const receipt = await WeeklyERC20Vesting.write.createStream(
          [
            recipient.account.address,
            BigInt(amountToVest) * erc20.ScoutTokenERC20_DECIMAL_MULTIPLIER,
            BigInt(latest + 1000)
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
          BigInt(amountToVest) * erc20.ScoutTokenERC20_DECIMAL_MULTIPLIER
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

        const balance = await erc20.balanceOfScoutTokenERC20({
          account: streamCreator.account.address
        });

        expect(balance).toBe(100_000);
      });
    });
  });

  describe('claim()', () => {
    describe('effects', () => {
      const allocationPercentages = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10];

      it(`allows the protocol contract to receive a stream, unlocked in 13 weekly increments by any wallet following the allocation percentages: ${allocationPercentages.join(', ')}`, async () => {
        const { ScoutProtocolProxyContract } = protocol;

        const operator = await walletFromKey();

        // Fund the stream creator with some tokens
        await erc20.fundWallet({
          account: streamCreator.account.address,
          amount: 200_000
        });

        const amountToVest = 100_000;
        const totalWeeks = allocationPercentages.length;

        const startDate = vesting.nowIshInSeconds() + BigInt(1000);

        const stream = await createStream({
          erc20,
          recipient: ScoutProtocolProxyContract.address,
          vesting,
          amountToVest,
          streamCreator,
          weeks: totalWeeks,
          startDate
        });

        let cumulativeClaimed = 0;
        const expectedPerTranche = allocationPercentages.map((percentage) => (amountToVest * percentage) / 100);

        const recipientBalance = await erc20.balanceOfScoutTokenERC20({
          account: ScoutProtocolProxyContract.address
        });

        expect(recipientBalance).toBe(0);

        const results: {
          week: number;
          recipientBalanceAfterClaim: number;
          percentage: number;
          claimed: number;
        }[] = [];

        for (let i = 0; i < totalWeeks; i++) {
          await time.setNextBlockTimestamp(stream.args.tranches[i].timestamp);

          await mine();

          await vesting.WeeklyERC20Vesting.write.claim([stream.args.streamId], {
            account: operator.account
          });

          cumulativeClaimed += expectedPerTranche[i];

          const recipientBalanceAfterClaim = await erc20.balanceOfScoutTokenERC20({
            account: ScoutProtocolProxyContract.address
          });

          results.push({
            week: i + 1,
            recipientBalanceAfterClaim,
            percentage: allocationPercentages[i],
            claimed: expectedPerTranche[i]
          });

          expect(recipientBalanceAfterClaim).toBe(cumulativeClaimed);
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

        const recipientBalance = await erc20.balanceOfScoutTokenERC20({
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
        }

        const recipientBalanceAfterClaim = await erc20.balanceOfScoutTokenERC20({
          account: recipient.account.address
        });

        // Weeks 1, 2, and 3 have respective percentages of 5%, 5%, and 6%
        const totalClaimed = amountToVest * (0.05 + 0.05 + 0.06);

        expect(recipientBalanceAfterClaim).toBe(totalClaimed);

        const expectedRefund = amountToVest - totalClaimed;

        const streamCreatorBalanceBeforeCancel = await erc20.balanceOfScoutTokenERC20({
          account: streamCreator.account.address
        });

        // Call the actual contract
        await vesting.SablierLockupTranched.write.cancel([stream.args.streamId], {
          account: streamCreator.account
        });

        const streamCreatorBalanceAfterCancel = await erc20.balanceOfScoutTokenERC20({
          account: streamCreator.account.address
        });

        expect(streamCreatorBalanceAfterCancel).toBe(streamCreatorBalanceBeforeCancel + expectedRefund);
      });
    });
  });
});
