import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Address, Chain } from "viem"
import { optimismSepolia, sepolia } from "viem/chains";
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
    builderNFTContract: '0xfba6c455a7180336d5a9cde1acacc6bdc5df798f'
  } as Connector,
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    chain: sepolia,
    easContract: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
    luckyStarCoinContract: NULL_ADDRESS,
    stargateProtocolContract: NULL_ADDRESS,
    builderNFTContract: NULL_ADDRESS
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