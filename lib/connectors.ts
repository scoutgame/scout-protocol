import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Address, Chain } from "viem"
import { base, baseSepolia, optimismSepolia, sepolia } from "viem/chains";
import { NULL_ADDRESS } from "./constants";

type Connector = {
  chain: Chain;
  rpcUrl: string;
  // See https://docs.attest.org/docs/quick--start/contracts for full list
  easContract: Address;
  luckyStarCoinContract: Address;
  stargateProtocolContract: Address;
  builderNFTContract: Address;
}

export const connectors = {
  opsepolia: {
    rpcUrl: 'https://sepolia.optimism.io',
    chain: optimismSepolia,
    easContract: '0x4200000000000000000000000000000000000021',
    luckyStarCoinContract: '0x2b02514966803597b8d29D885cBef46e31a85EE5',
    stargateProtocolContract: '0x2aec1dedd9a63173d673bcaa60564a4bae38bc38',
    builderNFTContract: '0x6ce2b047ce9c4c9a8179db5c7422364bfba20bb1'
  } as Connector,
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    chain: sepolia,
    easContract: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
    luckyStarCoinContract: NULL_ADDRESS,
    stargateProtocolContract: NULL_ADDRESS,
    builderNFTContract: NULL_ADDRESS
  } as Connector,
  basesepolia: {
    rpcUrl: 'https://sepolia.base.org',
    chain: baseSepolia,
    easContract: NULL_ADDRESS,
    luckyStarCoinContract: NULL_ADDRESS,
    stargateProtocolContract: NULL_ADDRESS,
    builderNFTContract: '0xb8f9bd7250f75224334817830d26572bd3592a2e'
  },
  base: {
    rpcUrl: 'https://mainnet.base.org',
    chain: base,
    easContract: NULL_ADDRESS,
    luckyStarCoinContract: NULL_ADDRESS,
    stargateProtocolContract: NULL_ADDRESS,
    builderNFTContract: '0x6fa2f63f9580db41f957160eca7b3bf127ce459d'
  }
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