import { vars } from 'hardhat/config';
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-ignition-viem';
import '@nomicfoundation/hardhat-viem';
import 'hardhat-jest'; // Enable support for Jest: https://www.npmjs.com/package/hardhat-jest

import { connectors, SupportedChains } from './lib/connectors';
import { NetworksUserConfig } from 'hardhat/types';


// Deploys
import './scripts/deploy/deployCreate2Factory';
import './scripts/deploy/deployLuckyStarCoin';
import './scripts/deploy/deployStargateProtocol';
import './scripts/deploy/deployBuilderNft';

// Interactions
import './scripts/interact/getUnclaimedBalance';
import './scripts/interact/claimBalance';
import './scripts/interact/builderNftApp'

const PRIVATE_KEY = vars.get('PRIVATE_KEY');

const config: Omit<HardhatUserConfig, 'networks'> & {networks: Record<SupportedChains, NetworksUserConfig[string]>} = {
  solidity: '0.8.26',
  networks: {
    opsepolia: {
      url: connectors.opsepolia.rpcUrl,
      accounts: [PRIVATE_KEY],
      // add gas to avoid errros on deploy https://ethereum.stackexchange.com/questions/115223/cannot-estimate-gas-transaction-may-fail-or-may-require-manual-gas-limit
      gas: 2100000,
      gasPrice: 8000000000
    },
    sepolia: {
      url: connectors.sepolia.rpcUrl,
      accounts: [PRIVATE_KEY],
      // add gas to avoid errros on deploy https://ethereum.stackexchange.com/questions/115223/cannot-estimate-gas-transaction-may-fail-or-may-require-manual-gas-limit
      gas: 2100000,
      gasPrice: 8000000000
    }
  } as Record<SupportedChains, NetworksUserConfig[string]>,
  paths: {
    tests: './__test__'
  }
};

export default config;
