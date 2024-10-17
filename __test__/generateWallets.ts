import { viem } from 'hardhat';
import { publicActions } from 'viem';

export async function generateWallets() {
  const [adminAccount, userAccount, secondUserAccount, thirdUserAccount] = await viem.getWalletClients();

  return {
    adminAccount: adminAccount.extend(publicActions),
    userAccount: userAccount.extend(publicActions),
    secondUserAccount: secondUserAccount.extend(publicActions),
    thirdUserAccount: thirdUserAccount.extend(publicActions),
  }
}


export type GeneratedWallet = Awaited<ReturnType<typeof generateWallets>>['userAccount'];