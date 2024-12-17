import { viem } from 'hardhat';
import type { Address } from 'viem';

import { generateWallets } from './generateWallets';

export async function deployScoutProtocolBuilderNftContract({
  ScoutScoutTokenERC20Address
}: {
  ScoutScoutTokenERC20Address: Address;
}) {
  const { adminAccount: admin, thirdUserAccount: proceedsReceiverAccount } = await generateWallets();

  const implementation = await viem.deployContract('ScoutProtocolBuilderNFTImplementation', [], {
    client: { wallet: admin }
  });

  const proceedsReceiver = proceedsReceiverAccount.account.address;

  const proxy = await viem.deployContract(
    'ScoutProtocolBuilderNFTProxy',
    [implementation.address, ScoutScoutTokenERC20Address, proceedsReceiver],
    {
      client: { wallet: admin }
    }
  );

  // Make the implementation ABI available to the proxy
  const proxyWithImplementationABI = await viem.getContractAt(
    'ScoutProtocolBuilderNFTImplementation', // Implementation ABI
    proxy.address, // Proxy address
    { client: { wallet: admin } } // Use the admin account for interaction
  );

  return {
    builderProxyContract: proxy,
    builderNftContract: proxyWithImplementationABI,
    builderImplementationContract: implementation,
    builderNftAdminAccount: admin,
    proceedsReceiverAccount
  };
}

export type ScoutProtocolBuilderNFTFixture = Awaited<ReturnType<typeof deployScoutProtocolBuilderNftContract>>;