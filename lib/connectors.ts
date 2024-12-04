import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, Chain } from 'viem';
import { base, baseSepolia, optimism, optimismSepolia, sepolia } from 'viem/chains';

import { NULL_ADDRESS } from './constants';

// https://app.ens.domains/scoutgame.eth
export const proceedsReceiver = '0x93326D53d1E8EBf0af1Ff1B233c46C67c96e4d8D';

type ContractDeploymentEnvironment = 'dev' | 'stg' | 'prod';

type ContractDeployment<T extends string> = Partial<Record<ContractDeploymentEnvironment, Record<T, Address>>>;

type Connector = {
  chain: Chain;
  rpcUrl: string;
  // See https://docs.attest.org/docs/quick--start/contracts for full list
  easContract: Address;
  luckyStarCoinContract: Address;
  builderNFTContract: Address;
  usdcContract?: Address;
  seasonOneProxy?: Address | null;
  devProxy?: Address | null;
  testDevProxy?: Address | null;
  easBaseUrl?: string;
  easAttestationContract?: Address | null;
  scoutgameBuilderNftSeason02?: ContractDeployment<'proxy'>;
  seasonOneStarterPack?: ContractDeployment<'starterPack'>;
  sablier?: {
    SablierV2LockupTranched: Address | null;
  };
  scoutProtocol?: ContractDeployment<'protocol' | 'easResolver' | 'scoutERC20' | 'season02NFT' | 'sablierLockup'>;
  scoutgameEASResolver?: Address | null;
  scoutgameErc20TokenDev?: Address | null;
  scoutgameScoutProtocolProxyDev?: Address | null;
  scoutgameEASResolverDev?: Address | null;
  scoutgameErc20Token?: Address | null;
  scoutgameScoutProtocolProxy?: Address | null;
};
/**
 *
 * USDC Mainnet https://developers.circle.com/stablecoins/docs/usdc-on-main-networks
 * USDC Testnet https://developers.circle.com/stablecoins/docs/usdc-on-test-networks
 */

export const connectors = {
  opsepolia: {
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/0rLYBVk_UG9HAInXCNbYMX-gO5t1UxCM',
    chain: optimismSepolia,
    easContract: '0x4200000000000000000000000000000000000021',
    luckyStarCoinContract: '0x2b02514966803597b8d29D885cBef46e31a85EE5',
    builderNFTContract: '0xbd7b21e803147e0dcb698f6f76ce6dd530a545dd',
    usdcContract: '0x101e1C9757C99867a39Ceb41117B44F2292cB253',
    seasonOneProxy: '0x743ec903fe6d05e73b19a6db807271bb66100e83',
    devProxy: '0x26d76d564910c063d0953d8636add5027c0337ce',
    seasonOneStarterPack: {
      dev: {
        starterPack: '0x2df3291c35526d4962476aa87b72ac4d99c0366a'
      }
    }
  } as Connector,
  optimism: {
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/0rLYBVk_UG9HAInXCNbYMX-gO5t1UxCM',
    chain: optimism,
    easContract: NULL_ADDRESS,
    luckyStarCoinContract: NULL_ADDRESS,
    builderNFTContract: '0x7df4d9f54a5cddfef50a032451f694d6345c60af',
    usdcContract: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    seasonOneProxy: '0x743ec903fe6d05e73b19a6db807271bb66100e83',
    devProxy: '0x1d305a06cb9dbdc32e08c3d230889acb9fe8a4dd',
    testDevProxy: '0x2cba9c6e0c14da826b0ec689cabf02a6f6b9808e',
    seasonOneStarterPack: {
      dev: {
        starterPack: '0xaed6174a1936a089df22f7eaf85ffddf37bd3ff4'
      },
      stg: {
        starterPack: '0xd85b1e922b70f4577aeff71c027efa5b6c1c9598'
      },
      prod: {
        starterPack: '0x66cb3bd53f899aed2306f64ec9f36987e4cc742b'
      }
    }
  } as Connector,
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    chain: sepolia,
    easContract: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
    luckyStarCoinContract: NULL_ADDRESS,
    builderNFTContract: NULL_ADDRESS,
    usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  } as Connector,
  basesepolia: {
    rpcUrl: 'https://sepolia.base.org',
    chain: baseSepolia,
    easContract: NULL_ADDRESS,
    luckyStarCoinContract: NULL_ADDRESS,
    // This is the new version of the contract with a sudo-type mint
    builderNFTContract: '0xec66b6a6c2ce744543517776ff9906cd41c50a63',
    usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    scoutgameEASResolver: '0x0cf1faf544bf98b062995848cc03cc8714bbca52',
    scoutgameErc20Token: '0x3fb476010cc55aca277e48e5a1f25fc096a21cc6',
    scoutgameScoutProtocolProxy: '0x2271eac711b718110996c2a5dceb3d50eca942b2',
    scoutgameEASResolverDev: '0xb9115c33820ce213449c38949c4e1927787ad902',
    scoutgameErc20TokenDev: '0x8a392ed8dafd051998fcba376468c6e2992b92f0',
    scoutgameScoutProtocolProxyDev: '0xdf6b022854cf0df9a15f923f0c3df55d099899e1',
    easAttestationContract: '0x4200000000000000000000000000000000000021',
    easBaseUrl: 'https://base-sepolia.easscan.org',
    scoutProtocol: {
      stg: {
        protocol: '0x2271eac711b718110996c2a5dceb3d50eca942b2',
        easResolver: '0x0cf1faf544bf98b062995848cc03cc8714bbca52',
        scoutERC20: '0x4abb40eceddf8d4e2a59996ada8e5baea0bff5e0',
        season02NFT: '0x4753e3074af8a34cb2aa1954b23c7f0befd5bc2c',
        sablierLockup: '' as Address
      }
    },
    sablier: {
      // https://docs.sablier.com/contracts/v2/deployments#base-sepolia
      SablierV2LockupTranched: '0xb8c724df3eC8f2Bf8fA808dF2cB5dbab22f3E68c'
    }
  } as Connector,
  base: {
    rpcUrl: 'https://mainnet.base.org',
    chain: base,
    easContract: NULL_ADDRESS,
    luckyStarCoinContract: NULL_ADDRESS,
    builderNFTContract: '0x278cc8861cfc93ea47c9e89b1876d0def2037c27',
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    easAttestationContract: '0x4200000000000000000000000000000000000021',
    easBaseUrl: 'https://base.easscan.org'
  } as Connector
} as const;

export function getConnectorKey(chainId: number) {
  const key = Object.entries(connectors).find(([, val]) => val.chain.id === chainId)?.[0];

  if (!key) {
    throw new Error('Key not found');
  }

  return key;
}

export type SupportedChains = keyof typeof connectors;

export function getConnectorFromHardhatRuntimeEnvironment(hre: HardhatRuntimeEnvironment): Connector {
  const chainName = hre.hardhatArguments.network;

  if (!chainName) {
    throw new Error('No network specified');
  }

  const connector = connectors[chainName as SupportedChains];

  if (!connector) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }

  return connector;
}

export function getEasUrl({
  chain,
  type,
  uid
}: {
  chain: SupportedChains;
  type: 'schemas_list' | 'schema' | 'attestion';
  uid?: string;
}) {
  const baseUrl = connectors[chain].easBaseUrl || '';

  if (type === 'schemas_list') {
    return `${baseUrl}/schemas`;
  } else if (type === 'schema') {
    return `${baseUrl}/schema/view/${uid}`;
  } else if (type === 'attestion') {
    return `${baseUrl}/attestation/view/${uid}`;
  }

  throw new Error('Invalid type');
}
