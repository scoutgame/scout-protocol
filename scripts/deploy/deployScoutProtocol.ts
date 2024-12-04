import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer';
import type { Address } from 'viem';
import { createPublicClient, createWalletClient, http, isAddress, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployScoutProtocol', 'Deploys or updates the ScoutProtocol contracts').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  await hre.run('compile');

  const client = createPublicClient({
    chain: connector.chain,
    transport: http(connector.rpcUrl)
  });

  const account = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: connector.chain,
    transport: http(connector.rpcUrl)
  });

  console.log('Using account:', account.address, 'on chain:', connector.chain.name);

  // Deploy the implementation contract first
  console.log('Deploying the implementation contract...');

  const deployedImplementation = await hre.viem.deployContract('ScoutProtocolImplementation', [], {
    client: walletClient as any
  });

  const implementationAddress = deployedImplementation.address;

  if (!implementationAddress) {
    throw new Error('Failed to deploy implementation contract');
  }

  console.log('Implementation contract deployed at address:', implementationAddress);

  // Verify contract in the explorer

  console.log('Verifying implementation with etherscan');
  try {
    execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${implementationAddress}`);
  } catch (err) {
    console.warn('Error verifying contract', err);
  }

  fs.writeFileSync(
    path.resolve('abis', 'ScoutProtocolImplementation.json'),
    JSON.stringify(deployedImplementation.abi, null, 2)
  );

  const proxyOptions = [];

  if (connector.scoutProtocol?.prod?.protocol) {
    proxyOptions.push({ address: connector.scoutProtocol?.prod.protocol, env: 'prod' });
  }

  if (connector.scoutProtocol?.stg?.protocol) {
    proxyOptions.push({ address: connector.scoutProtocol?.stg.protocol, env: 'stg' });
  }

  if (connector.scoutProtocol?.dev?.protocol) {
    proxyOptions.push({ address: connector.scoutProtocol?.dev.protocol, env: 'dev' });
  }

  let deployNew = true;

  // Prompt the user to update the implementation if the proxy already exists
  if (proxyOptions.length > 0) {
    console.log('Proxy options:', proxyOptions);

    const newProxyOption = 'New Proxy';

    const { selectedProxy } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProxy',
        message: 'Select a proxy contract to use:',
        choices: [...proxyOptions.map((opt) => `${opt.env}:: ${opt.address!.slice(0, 6)}`), newProxyOption]
      }
    ]);

    if (selectedProxy !== newProxyOption) {
      deployNew = false;

      const proxyToUpdate = proxyOptions.find(
        (opt) => opt.env === ((selectedProxy as string).split('::').shift()?.trim() as string)
      )?.address as `0x${string}`;

      if (!isAddress(proxyToUpdate)) {
        throw new Error(`Proxy ${proxyToUpdate} is not an address`);
      }

      const { updateImplementation } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'updateImplementation',
          message: 'Do you want to update the proxy to use the new implementation?',
          default: false
        }
      ]);

      if (updateImplementation) {
        console.log('Updating proxy to use the new implementation...');

        const proxyAbi = [parseAbiItem('function setImplementation(address _newImplementation)')];

        const txHash = await walletClient.writeContract({
          address: proxyToUpdate,
          abi: proxyAbi,
          functionName: 'setImplementation',
          args: [implementationAddress]
        });

        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log('Proxy implementation updated. Transaction hash:', receipt.transactionHash);
      } else {
        console.log('Proxy implementation not updated.');
        process.exit(0);
      }
    }
  }

  if (deployNew) {
    const { paymentTokenAddress } = await inquirer.prompt([
      {
        type: 'input',
        name: 'paymentTokenAddress',
        message: 'Enter the address for scout protocol ERC20 token',
        validate: (input) => (isAddress(input) ? true : 'Invalid address')
      }
    ]);

    if (!paymentTokenAddress) {
      throw new Error('Payment token address (Scout ERC20 contract) not specified in the connector');
    }

    const deployArgs = [implementationAddress, paymentTokenAddress] as [Address, Address];

    const deployedProxy = await hre.viem.deployContract('ScoutProtocolProxy', deployArgs, {
      client: walletClient as any
    });
    const proxyAddress = deployedProxy.address;

    if (!proxyAddress) {
      throw new Error(`Failed to deploy proxy`);
    }

    console.log('Proxy contract deployed at address:', proxyAddress);

    console.log('Verifying proxy contract with etherscan..');
    try {
      execSync(
        `npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${proxyAddress} ${deployArgs.join(' ')}`
      );
    } catch (err) {
      console.warn('Error verifying contract', err);
    }

    fs.writeFileSync(path.resolve('abis', 'ScoutProtocolProxy.json'), JSON.stringify(deployedProxy.abi, null, 2));
  }

  console.log('Deployment and update process completed.');
});

module.exports = {};
