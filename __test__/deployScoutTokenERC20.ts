import { viem } from 'hardhat';
import type { Address } from 'viem';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export async function deployScoutTokenERC20() {
  const { adminAccount, secondUserAccount } = await generateWallets();

  const ScoutTokenERC20Deployed = await viem.deployContract('ScoutTokenERC20Implementation', [], {
    client: { wallet: adminAccount }
  });

  const proxy = await viem.deployContract(
    'ScoutTokenERC20Proxy',
    [ScoutTokenERC20Deployed.address, adminAccount.account.address],
    {
      client: { wallet: adminAccount }
    }
  );

  const ScoutTokenERC20ProxyWithImplementationAbi = await viem.getContractAt(
    'ScoutTokenERC20Implementation',
    proxy.address,
    {
      client: { wallet: adminAccount }
    }
  );

  await ScoutTokenERC20ProxyWithImplementationAbi.write.initialize();

  const decimals = BigInt(await ScoutTokenERC20ProxyWithImplementationAbi.read.decimals());

  const decimalMultiplier = 10n ** decimals;

  async function transfer({
    args: { to, amount },
    wallet
  }: {
    args: { to: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ScoutTokenERC20ProxyWithImplementationAbi.write.transfer([to, BigInt(amount) * decimalMultiplier], {
      account: wallet.account
    });
  }

  async function balanceOf({ account }: { account: Address }) {
    const balance = await ScoutTokenERC20ProxyWithImplementationAbi.read.balanceOf([account], {
      account: secondUserAccount.account
    });

    return Number(balance / decimalMultiplier);
  }

  async function approve({
    args: { spender, amount },
    wallet
  }: {
    args: { spender: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ScoutTokenERC20ProxyWithImplementationAbi.write.approve([spender, BigInt(amount) * decimalMultiplier], {
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
    await ScoutTokenERC20ProxyWithImplementationAbi.write.transferFrom([from, to, BigInt(amount) * decimalMultiplier], {
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
    ScoutTokenERC20: ScoutTokenERC20ProxyWithImplementationAbi,
    ScoutTokenERC20Proxy: proxy,
    ScoutTokenERC20Implementation: ScoutTokenERC20Deployed,
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
