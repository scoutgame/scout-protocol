import { viem } from 'hardhat';
import type { Address } from 'viem';

import { deployTestUSDC } from './deployTestUSDC';
import { generateWallets } from './generateWallets';

export async function deployBuilderNftContract({ USDCContractAddress }: { USDCContractAddress?: Address } = {}) {
  const { adminAccount: admin, userAccount: otherAccount } = await generateWallets();

  const memoryUtils = await viem.deployContract('MemoryUtils');

  const implementation = await viem.deployContract('BuilderNFTSeasonOneImplementation01');

  const proceedsReceiver = otherAccount.account.address;

  const erc20Contract = USDCContractAddress || (await deployTestUSDC().then(({ USDC }) => USDC.address));

  const proxy = await viem.deployContract('BuilderNFTSeasonOneUpgradeable', [
    implementation.address,
    erc20Contract as Address,
    proceedsReceiver
  ]);

  // Make the implementation ABI available to the proxy
  const proxyWithImplementationABI = await viem.getContractAt(
    'BuilderNFTSeasonOneImplementation01', // Implementation ABI
    proxy.address, // Proxy address
    { client: { wallet: admin } } // Use the admin account for interaction
  );

  return {
    builderProxyContract: proxy,
    builderNftContract: proxyWithImplementationABI,
    builderImplementationContract: implementation,
    builderNftAdminAccount: admin
  };
}

export type BuilderNftFixture = Awaited<ReturnType<typeof deployBuilderNftContract>>;
