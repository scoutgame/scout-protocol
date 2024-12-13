import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployScoutGameERC20', 'Deploys or updates the Scout Game ERC20 contract').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  await hre.run('compile');

  const account = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: connector.chain,
    transport: http(connector.rpcUrl)
  });

  console.log('Using account:', account.address, 'on chain:', connector.chain.name);

  // Deploy the implementation contract first
  console.log('Deploying the ERC20 contract...');

  const deployedErc20 = await hre.viem.deployContract(
    'ScoutTokenERC20',
    // Deployer is the admin and the distribution wallet
    [walletClient.account.address, walletClient.account.address],
    {
      client: walletClient as any
    }
  );

  const erc20Address = deployedErc20.address;

  if (!erc20Address) {
    throw new Error('Failed to deploy erc20 contract');
  }

  console.log('Implementation contract deployed at address:', erc20Address);

  // Verify contract in the explorer

  console.log('Verifying implementation with etherscan');
  try {
    execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${erc20Address}`);
  } catch (err) {
    console.warn('Error verifying contract', err);
  }

  console.log('Writing ABI to file');

  fs.writeFileSync(
    path.resolve(__dirname, '..', '..', 'abis', 'ScoutTokenERC20.json'),
    JSON.stringify(deployedErc20.abi, null, 2)
  );

  console.log('Complete');
});

module.exports = {};
