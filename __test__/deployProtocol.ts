import { viem } from 'hardhat';
import type { Address } from 'viem';

import { deployProtocolERC20Token } from './deployProtocolERC20Token';
import { generateWallets } from './generateWallets';

export async function deployProtocolContract({ ProtocolERC20Address }: { ProtocolERC20Address?: Address } = {}) {
  const { adminAccount: admin } = await generateWallets();

  const implementation = await viem.deployContract('ProtocolImplementation');

  const erc20ContractAddress =
    ProtocolERC20Address || (await deployProtocolERC20Token().then(({ ProtocolERC20 }) => ProtocolERC20.address));

  console.log({
    erc20ContractAddress
  });

  const proxy = await viem.deployContract('ProtocolProxy', [implementation.address, erc20ContractAddress as Address], {
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
    protocolProxyWithImplementationContract: proxyWithImplementationABI,
    protocolAdminAccount: admin
  };
}

export type BuilderNftFixture = Awaited<ReturnType<typeof deployProtocolContract>>;
