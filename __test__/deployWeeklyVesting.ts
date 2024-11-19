import { viem } from 'hardhat';
import type { Address } from 'viem';

import { walletFromKey } from './generateWallets';

export async function deployWeeklyVesting({ ScoutERC20Address }: { ScoutERC20Address: Address }) {
  const sablierAdminAccount = await walletFromKey();

  const SablierNFTDescriptor = await viem.deployContract('SablierV2NFTDescriptor', []);

  const SablierLockupTranched = await viem.deployContract('SablierV2LockupTranched', [
    sablierAdminAccount.account.address,
    SablierNFTDescriptor.address,
    BigInt(52)
  ]);

  const WeeklyERC20Vesting = await viem.deployContract('LockupWeeklyStreamCreator', [
    ScoutERC20Address,
    SablierLockupTranched.address
  ]);

  // Return the proxy with the implementation ABI attached
  return {
    WeeklyERC20Vesting,
    SablierLockupTranched,
    SablierNFTDescriptor,
    nowIshInSeconds() {
      return BigInt(Math.ceil(Date.now() / 1000)) + BigInt(20);
    }
  };
}

export type WeeklyVestingTestFixture = Awaited<ReturnType<typeof deployWeeklyVesting>>;
