import { viem } from 'hardhat';

export async function generateWallets() {
  const [adminAccount, userAccount, secondUserAccount, thirdUserAccount] = await viem.getWalletClients();

  return {
    adminAccount,
    userAccount,
    secondUserAccount,
    thirdUserAccount
  }
}


export type GeneratedWallet = Awaited<ReturnType<typeof generateWallets>>['userAccount'];