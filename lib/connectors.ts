import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Chain } from "viem"
import { optimismSepolia, sepolia } from "viem/chains";

type Connector = {
  chain: Chain;
  rpcUrl: string;
}

export const connectors = {
  opsepolia: {
    rpcUrl: 'https://sepolia.optimism.io',
    chain: optimismSepolia
  } as Connector,
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    chain: sepolia
  } as Connector
} as const;

export type SupportedChains = keyof typeof connectors;

export function getConnectorFromHardhatRuntimeEnvironment(hre: HardhatRuntimeEnvironment): Connector {

  const chainName = hre.hardhatArguments.network;

  if (!chainName) {
    throw new Error('No network specified')
  }

  const connector = connectors[chainName as SupportedChains];

  if (!connector) {
    throw new Error(`Unsupported chain: ${chainName}`)
  }

  return connector;
}