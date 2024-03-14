import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-ignition-viem';
import 'hardhat-jest'; // Enable support for Jest: https://www.npmjs.com/package/hardhat-jest

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  paths: {
    tests: './__test__'
  }
};

export default config;
