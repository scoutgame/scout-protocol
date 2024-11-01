import { viem } from 'hardhat';
import type { Address } from 'viem';
import { publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export async function generateWallets() {
  const [adminAccount, userAccount, secondUserAccount, thirdUserAccount] = await viem.getWalletClients();

  return {
    adminAccount: adminAccount.extend(publicActions),
    userAccount: userAccount.extend(publicActions),
    secondUserAccount: secondUserAccount.extend(publicActions),
    thirdUserAccount: thirdUserAccount.extend(publicActions)
  };
}

export type GeneratedWallet = Awaited<ReturnType<typeof generateWallets>>['userAccount'];

export async function walletFromKey({ key }: { key: string }): Promise<GeneratedWallet> {
  const account = privateKeyToAccount(key.startsWith('0x') ? (key as Address) : `0x${key}`);

  const [walletClient] = await viem.getWalletClients({ account });

  return walletClient.extend(publicActions);
}
