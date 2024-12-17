import { viem } from 'hardhat';
import type { Address } from 'viem';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export async function deployScoutTokenERC20() {
  const { adminAccount, secondUserAccount } = await generateWallets();

  const ScoutTokenERC20Deployed = await viem.deployContract('ScoutTokenERC20', [adminAccount.account.address], {
    client: { wallet: adminAccount }
  });

  const ScoutTokenERC20 = await viem.getContractAt('ScoutTokenERC20', ScoutTokenERC20Deployed.address, {
    client: { wallet: adminAccount }
  });

  const decimals = BigInt(await ScoutTokenERC20.read.decimals());

  const decimalMultiplier = 10n ** decimals;

  async function transfer({
    args: { to, amount },
    wallet
  }: {
    args: { to: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ScoutTokenERC20.write.transfer([to, BigInt(amount) * decimalMultiplier], { account: wallet.account });
  }

  async function balanceOf({ account }: { account: Address }) {
    const balance = await ScoutTokenERC20.read.balanceOf([account], { account: secondUserAccount.account });

    return Number(balance / decimalMultiplier);
  }

  async function approve({
    args: { spender, amount },
    wallet
  }: {
    args: { spender: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ScoutTokenERC20.write.approve([spender, BigInt(amount) * decimalMultiplier], {
      account: wallet.account
    });
  }

  async function transferFrom({
    args: { from, to, amount },
    wallet
  }: {
    args: { from: Address; to: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ScoutTokenERC20.write.transferFrom([from, to, BigInt(amount) * decimalMultiplier], {
      account: wallet.account
    });
  }

  /**
   * Transfers funds from the admin account, which holds entire supply
   */
  async function fundWallet({ account, amount }: { account: Address; amount: number }) {
    await transfer({ args: { to: account, amount }, wallet: adminAccount });
  }

  // Return the proxy with the implementation ABI attached
  return {
    ScoutTokenERC20,
    ScoutTokenERC20AdminAccount: adminAccount,
    ScoutTokenERC20_DECIMALS: decimals,
    ScoutTokenERC20_DECIMAL_MULTIPLIER: decimalMultiplier,
    transferScoutTokenERC20: transfer,
    balanceOfScoutTokenERC20: balanceOf,
    approveScoutTokenERC20: approve,
    transferScoutTokenERC20From: transferFrom,
    fundWallet
  };
}

export type ScoutTokenERC20TestFixture = Awaited<ReturnType<typeof deployScoutTokenERC20>>;
