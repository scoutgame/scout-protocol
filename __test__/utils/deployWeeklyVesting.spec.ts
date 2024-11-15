import { mine, time } from '@nomicfoundation/hardhat-network-helpers';
import { parseEventLogs } from 'viem';

import { prettyPrint } from '../../lib/prettyPrint';
import type { ProtocolERC20TestFixture } from '../deployScoutTokenERC20';
import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';
import { deployWeeklyVesting, type WeeklyVestingTestFixture } from '../deployWeeklyVesting';
import type { GeneratedWallet } from '../generateWallets';
import { walletFromKey } from '../generateWallets';

describe('deployScoutTokenERC20', () => {
  let weeklyVesting: WeeklyVestingTestFixture;
  let ProtocolERC20: ProtocolERC20TestFixture;
  let streamCreator: GeneratedWallet;
  let recipient: GeneratedWallet;

  beforeAll(async () => {
    ProtocolERC20 = await deployScoutTokenERC20();
    weeklyVesting = await deployWeeklyVesting({
      ScoutERC20Address: ProtocolERC20.ProtocolERC20.address
    });
    recipient = await walletFromKey();
    streamCreator = await walletFromKey();
  });

  it('should deploy the weekly vesting contract, with functional vesting', async () => {
    const { SablierLockupTranched, WeeklyERC20Vesting } = weeklyVesting;

    // Fund the stream creator with some tokens
    await ProtocolERC20.fundWallet({
      account: streamCreator.account.address,
      amount: 20_000
    });

    const amountToVest = 10_000;

    const totalWeeks = 10;

    // Approve the contract
    await ProtocolERC20.approveProtocolERC20({
      args: { spender: WeeklyERC20Vesting.address, amount: amountToVest },
      wallet: streamCreator
    });

    const receipt = await WeeklyERC20Vesting.write.createStream(
      [
        recipient.account.address,
        BigInt(amountToVest) * ProtocolERC20.ProtocolERC20_DECIMAL_MULTIPLIER,
        BigInt(Math.ceil(Date.now() / 1000) + 20),
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
    })[0].args;

    const recipientErc20Balance = await ProtocolERC20.balanceOfProtocolERC20({
      account: recipient.account.address
    });

    expect(recipientErc20Balance).toBe(0);

    await time.setNextBlockTimestamp(streamLog.tranches[0].timestamp);

    await mine();

    const withdrawReceipt = await SablierLockupTranched.write.withdrawMax(
      [streamLog.streamId, recipient.account.address],
      {
        account: recipient.account
      }
    );

    const withdrawOutput = await recipient.getTransactionReceipt({ hash: withdrawReceipt });

    const withdrawLog = parseEventLogs({
      abi: SablierLockupTranched.abi,
      logs: withdrawOutput.logs,
      eventName: ['WithdrawFromLockupStream']
    })[0].args;

    const recipientErc20BalanceAfter = await ProtocolERC20.balanceOfProtocolERC20({
      account: recipient.account.address
    });

    prettyPrint({
      recipientErc20BalanceAfter,
      amountToVest,
      streamLog,
      withdrawLog
    });

    expect(recipientErc20BalanceAfter).toBe(amountToVest / totalWeeks);
  });
});
