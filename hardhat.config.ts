import { vars } from 'hardhat/config';
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-ignition-viem';
import '@nomicfoundation/hardhat-viem';
import 'hardhat-jest'; // Enable support for Jest: https://www.npmjs.com/package/hardhat-jest

const SEPOLIA_PRIVATE_KEY = vars.get('PRIVATE_KEY');

const config: HardhatUserConfig = {
  solidity: '0.8.26',
  networks: {
    sepolia: {
      url: 'https://sepolia.optimism.io',
      accounts: [SEPOLIA_PRIVATE_KEY],
      // add gas to avoid errros on deploy https://ethereum.stackexchange.com/questions/115223/cannot-estimate-gas-transaction-may-fail-or-may-require-manual-gas-limit
      gas: 2100000,
      gasPrice: 8000000000
    }
  },
  paths: {
    tests: './__test__'
  }
};

export default config;
