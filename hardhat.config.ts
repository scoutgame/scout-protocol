import { vars } from 'hardhat/config';
import type { HardhatUserConfig } from 'hardhat/config';

import 'solidity-coverage';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-ignition-viem';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-viem';
import 'hardhat-jest'; // Enable support for Jest: https://www.npmjs.com/package/hardhat-jest

import type { NetworksUserConfig } from 'hardhat/types';

import type { SupportedChains } from './lib/connectors';
import { connectors } from './lib/connectors';

// Deploys ------------------------------
import './scripts/deploy/nfts/deployBuilderNft';
import './scripts/deploy/nfts/deployBuilderNftSeason02';

// Scout Game Protocol
import './scripts/deploy/deployScoutGameErc20';
import './scripts/deploy/deployScoutProtocol';
import './scripts/deploy/deployEASSchemas';
import './scripts/deploy/nfts/deployBuilderNftStarterPack';
import './scripts/deploy/deployVesting';

// Interactions ------------------------------
import './scripts/interact/builderNftApp';
import './scripts/interact/scoutProtocol';
import './scripts/interact/scoutProtocolToken';
import './scripts/interact/scoutProtocolResolver';
import './scripts/interact/updateProxyImplementation';
import './scripts/interact/builderNftStarterPackApp';

const PRIVATE_KEY = vars.get('PRIVATE_KEY');

// Gas prices fetched from blockscout. Last refreshed Sep. 18th 2024
const config: Omit<HardhatUserConfig, 'networks'> & { networks: Record<SupportedChains, NetworksUserConfig[string]> } =
  {
    solidity: {
      compilers: [
        {
          version: '0.8.26', // Your contracts
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            }
          }
        },
        {
          version: '0.6.12', // USDC contracts
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            }
          }
        }
      ]
    },
    networks: {
      opsepolia: {
        url: connectors.opsepolia.rpcUrl,
        accounts: [PRIVATE_KEY],
        // add gas to avoid errros on deploy https://ethereum.stackexchange.com/questions/115223/cannot-estimate-gas-transaction-may-fail-or-may-require-manual-gas-limit
        gas: 2100000,
        gasPrice: 1e8
      },
      optimism: {
        url: connectors.optimism.rpcUrl,
        accounts: [PRIVATE_KEY],
        // add gas to avoid errros on deploy https://ethereum.stackexchange.com/questions/115223/cannot-estimate-gas-transaction-may-fail-or-may-require-manual-gas-limit
        gas: 2100000,
        gasPrice: 1e11
      },
      sepolia: {
        url: connectors.sepolia.rpcUrl,
        accounts: [PRIVATE_KEY],
        // add gas to avoid errros on deploy https://ethereum.stackexchange.com/questions/115223/cannot-estimate-gas-transaction-may-fail-or-may-require-manual-gas-limit
        gas: 8e9
      },
      basesepolia: {
        url: connectors.basesepolia.rpcUrl,
        accounts: [PRIVATE_KEY],
        gasPrice: 4e8
      },
      base: {
        url: connectors.basesepolia.rpcUrl,
        accounts: [PRIVATE_KEY],
        gasPrice: 3e7
      }
    } as Record<SupportedChains, NetworksUserConfig[string]>,
    paths: {
      tests: './__test__'
    },
    etherscan: {
      apiKey: {
        opsepolia: '97FJRW1Q7XF1ATMCRUUN372HNK25WNT6JJ',
        optimism: '97FJRW1Q7XF1ATMCRUUN372HNK25WNT6JJ',
        basesepolia: '97FJRW1Q7XF1ATMCRUUN372HNK25WNT6JJ'
      },
      customChains: [
        {
          network: 'opsepolia',
          chainId: 11155420,
          urls: {
            apiURL: 'https://optimism-sepolia.blockscout.com/api',
            browserURL: 'https://optimism-sepolia.blockscout.com'
          }
        },
        {
          network: 'basesepolia',
          chainId: 84532,
          urls: {
            apiURL: 'https://base-sepolia.blockscout.com/api',
            browserURL: 'https://base-sepolia.blockscout.com'
          }
        },
        {
          network: 'optimism',
          chainId: 10,
          urls: {
            apiURL: 'https://optimism.blockscout.com/api',
            browserURL: 'https://optimism.blockscout.com'
          }
        }
        // {
        //   network: 'opsepolia',
        //   chainId: 11155420,
        //   urls: {
        //     apiURL: 'https://api-sepolia-optimism.etherscan.io/api',
        //     browserURL: 'https://sepolia-optimism.etherscan.io'
        //   }
        // },
        // {
        //   network: 'optimism',
        //   chainId: 10,
        //   urls: {
        //     apiURL: 'https://api-optimistic.etherscan.io/api',
        //     browserURL: 'https://optimistic.etherscan.io'
        //   }
        // }
      ]
    }
  };

export default config;
