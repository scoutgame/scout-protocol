import { setBalance } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { viem } from 'hardhat';
import type { Address } from 'viem';
import { publicActions } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

export type GeneratedWalletConfig = {
  initialEthBalance?: number;
};

export async function generateWallets({ initialEthBalance = 1 }: GeneratedWalletConfig = { initialEthBalance: 1 }) {
  const [adminAccount, userAccount, secondUserAccount, thirdUserAccount] = await Promise.all([
    viem
      .getWalletClients({
        account: privateKeyToAccount(generatePrivateKey())
      })
      .then(([client]) => client.extend(publicActions)),
    viem
      .getWalletClients({
        account: privateKeyToAccount(generatePrivateKey())
      })
      .then(([client]) => client.extend(publicActions)),
    viem
      .getWalletClients({
        account: privateKeyToAccount(generatePrivateKey())
      })
      .then(([client]) => client.extend(publicActions)),
    viem
      .getWalletClients({
        account: privateKeyToAccount(generatePrivateKey())
      })
      .then(([client]) => client.extend(publicActions))
  ]);

  if (initialEthBalance) {
    const balance = BigInt(initialEthBalance * 1e18);

    setBalance(userAccount.account.address, balance);
    setBalance(secondUserAccount.account.address, balance);
    setBalance(thirdUserAccount.account.address, balance);
    setBalance(adminAccount.account.address, balance);
  }

  return {
    adminAccount: adminAccount.extend(publicActions),
    userAccount: userAccount.extend(publicActions),
    secondUserAccount: secondUserAccount.extend(publicActions),
    thirdUserAccount: thirdUserAccount.extend(publicActions)
  };
}

export type GeneratedWallet = Awaited<ReturnType<typeof generateWallets>>['userAccount'];

export async function walletFromKey({
  key,
  initialEthBalance
}: { key: string } & GeneratedWalletConfig): Promise<GeneratedWallet> {
  const account = privateKeyToAccount(key.startsWith('0x') ? (key as Address) : `0x${key}`);

  if (initialEthBalance) {
    setBalance(account.address, BigInt(initialEthBalance * 1e18));
  }

  const [walletClient] = await viem.getWalletClients({ account });

  return walletClient.extend(publicActions);
}
