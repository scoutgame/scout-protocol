import { viem } from 'hardhat';
import type { Address } from 'viem';

import { generateWallets } from './generateWallets';

export async function deployProtocolContract({ ProtocolERC20Address }: { ProtocolERC20Address: Address }) {
  const { adminAccount: admin, userAccount: user } = await generateWallets();

  const implementation = await viem.deployContract('ProtocolImplementation');

  const proxy = await viem.deployContract('ProtocolProxy', [implementation.address, ProtocolERC20Address as Address], {
    client: { wallet: admin }
  });

  // Make the implementation ABI available to the proxy
  const proxyWithImplementationABI = await viem.getContractAt(
    'ProtocolImplementation', // Implementation ABI
    proxy.address, // Proxy address
    { client: { wallet: admin } } // Use the admin account for interaction
  );

  return {
    protocolProxyContract: proxy,
    protocolImplementationContract: implementation,
    protocolContract: proxyWithImplementationABI,
    protocolAdminAccount: admin,
    protocolUserAccount: user
  };
}

export type ProtocolTestFixture = Awaited<ReturnType<typeof deployProtocolContract>>;
