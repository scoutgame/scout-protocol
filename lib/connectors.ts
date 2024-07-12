import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Address, Chain } from "viem"
import { optimismSepolia, sepolia } from "viem/chains";
import { NULL_ADDRESS } from "./constants";

type Connector = {
  chain: Chain;
  rpcUrl: string;
  // See https://docs.attest.org/docs/quick--start/contracts for full list
  easContract: Address;
  stardustCoinContract: Address;
  stargateProtocolContract: Address;
}

export const connectors = {
  opsepolia: {
    rpcUrl: 'https://sepolia.optimism.io',
    chain: optimismSepolia,
    easContract: '0x4200000000000000000000000000000000000021',
    stardustCoinContract: '0xa7FF66C08d85c9362DED96fd4F8DDaf73A86eec0',
    stargateProtocolContract: '0xda8793f28080ac2473032dc50497b93de0c1c67b'
  } as Connector,
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    chain: sepolia,
    easContract: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
    stardustCoinContract: NULL_ADDRESS,
    stargateProtocolContract: NULL_ADDRESS
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