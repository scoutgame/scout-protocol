import { viem } from 'hardhat';
import type { Address } from 'viem';

import { generateWallets } from './generateWallets';

export async function deployProtocolContract({ ScoutTokenERC20Address }: { ScoutTokenERC20Address: Address }) {
  const { adminAccount: admin, userAccount: user } = await generateWallets();

  const implementation = await viem.deployContract('ScoutProtocolImplementation');

  const proxy = await viem.deployContract(
    'ScoutProtocolProxy',
    [implementation.address, ScoutTokenERC20Address as Address],
    {
      client: { wallet: admin }
    }
  );

  // Make the implementation ABI available to the proxy
  const proxyWithImplementationABI = await viem.getContractAt(
    'ScoutProtocolImplementation', // Implementation ABI
    proxy.address, // Proxy address
    { client: { wallet: admin } } // Use the admin account for interaction
  );

  return {
    ScoutProtocolProxyContract: proxy,
    ScoutProtocolImplementationContract: implementation,
    protocolContract: proxyWithImplementationABI,
    protocolAdminAccount: admin,
    protocolUserAccount: user
  };
}

export type ProtocolTestFixture = Awaited<ReturnType<typeof deployProtocolContract>>;
