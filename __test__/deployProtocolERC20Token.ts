import { viem } from 'hardhat';
import type { Address } from 'viem';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export async function deployProtocolERC20Token() {
  const { adminAccount, secondUserAccount } = await generateWallets();

  const ProtocolERC20Deployed = await viem.deployContract('ProtocolERC20Token', [], {
    client: { wallet: adminAccount }
  });

  const ProtocolERC20 = await viem.getContractAt('ProtocolERC20Token', ProtocolERC20Deployed.address, {
    client: { wallet: adminAccount }
  });

  const decimals = BigInt(await ProtocolERC20.read.decimals());

  async function mintTo({ account, amount }: { account: string; amount: number }) {
    await ProtocolERC20.write.mint([account as Address, BigInt(amount) * decimals], {
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
    await ProtocolERC20.write.transfer([to, BigInt(amount) * decimals], { account: wallet.account });
  }

  async function balanceOf({ account }: { account: Address }) {
    const balance = await ProtocolERC20.read.balanceOf([account], { account: secondUserAccount.account });

    return Number(balance / decimals);
  }

  async function approve({
    args: { spender, amount },
    wallet
  }: {
    args: { spender: Address; amount: number };
    wallet: GeneratedWallet;
  }) {
    await ProtocolERC20.write.approve([spender, BigInt(amount) * decimals], {
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
    await ProtocolERC20.write.transferFrom([from, to, BigInt(amount) * decimals], {
      account: wallet.account
    });
  }

  // Return the proxy with the implementation ABI attached
  return {
    ProtocolERC20,
    ProtocolERC20AdminAccount: adminAccount,
    ProtocolERC20_DECIMALS: decimals,
    mintProtocolERC20To: mintTo,
    transferProtocolERC20: transfer,
    balanceOfProtocolERC20: balanceOf,
    approveProtocolERC20: approve,
    transferProtocolERC20From: transferFrom
  };
}

export type ProtocolERC20TestFixture = Awaited<ReturnType<typeof deployProtocolERC20Token>>;
