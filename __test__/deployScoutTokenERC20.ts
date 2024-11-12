import { viem } from 'hardhat';
import type { Address } from 'viem';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export async function deployScoutTokenERC20() {
  const { adminAccount, secondUserAccount } = await generateWallets();

  const ProtocolERC20Deployed = await viem.deployContract('ScoutTokenERC20', [], {
    client: { wallet: adminAccount }
  });

  const ProtocolERC20 = await viem.getContractAt('ScoutTokenERC20', ProtocolERC20Deployed.address, {
    client: { wallet: adminAccount }
  });

  const decimals = BigInt(await ProtocolERC20.read.decimals());

  const decimalMultiplier = 10n ** decimals;

  async function mintTo({ account, amount }: { account: string; amount: number }) {
    await ProtocolERC20.write.mint([account as Address, BigInt(amount) * decimalMultiplier], {
      account: adminAccount.account
    });
  }

  async function transfer({
    args: { to, amount },
    wallet
  }: {
    args: { to: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ProtocolERC20.write.transfer([to, BigInt(amount) * decimalMultiplier], { account: wallet.account });
  }

  async function balanceOf({ account }: { account: Address }) {
    const balance = await ProtocolERC20.read.balanceOf([account], { account: secondUserAccount.account });

    return Number(balance / decimalMultiplier);
  }

  async function approve({
    args: { spender, amount },
    wallet
  }: {
    args: { spender: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ProtocolERC20.write.approve([spender, BigInt(amount) * decimalMultiplier], {
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
    await ProtocolERC20.write.transferFrom([from, to, BigInt(amount) * decimalMultiplier], {
      account: wallet.account
    });
  }

  // Return the proxy with the implementation ABI attached
  return {
    ProtocolERC20,
    ProtocolERC20AdminAccount: adminAccount,
    ProtocolERC20_DECIMALS: decimals,
    ProtocolERC20_DECIMAL_MULTIPLIER: decimalMultiplier,
    mintProtocolERC20To: mintTo,
    transferProtocolERC20: transfer,
    balanceOfProtocolERC20: balanceOf,
    approveProtocolERC20: approve,
    transferProtocolERC20From: transferFrom
  };
}

export type ProtocolERC20TestFixture = Awaited<ReturnType<typeof deployScoutTokenERC20>>;
