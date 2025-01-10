import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer';
import type { Address } from 'viem';
import { createPublicClient, createWalletClient, http, isAddress, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey, proceedsReceiver } from '../../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployScoutProtocolBuilderNFT', 'Deploys or updates the Scout Protocol Builder NFT contracts').setAction(
  async (taskArgs, hre) => {
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

    const implementation = await hre.viem.deployContract('ScoutProtocolBuilderNFTImplementation', [], {
      client: {
        wallet: walletClient
      }
    });

    const implementationAddress = implementation.address;
    const implementationABI = implementation.abi;

    console.log('Implementation contract deployed at address:', implementationAddress);

    // Verify contract in the explorer
    console.log('Verifying implementation with etherscan');
    try {
      execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${implementationAddress}`);
    } catch (err) {
      console.warn('Error verifying contract', err);
    }

    fs.writeFileSync(
      path.resolve('abis', 'ScoutProtocolBuilderNFTImplementation.json'),
      JSON.stringify(implementationABI, null, 2)
    );

    let deployNew = true;

    // Prompt the user to update the implementation if the proxy already exists
    if (connector.scoutProtocolBuilderNFT) {
      const proxyOptions = [];

      const devProxy = connector.scoutProtocolBuilderNFT.dev;
      if (devProxy) {
        proxyOptions.push({ address: devProxy, env: 'dev' });
      }

      const stgProxy = connector.scoutProtocolBuilderNFT.stg;
      if (stgProxy) {
        proxyOptions.push({ address: stgProxy, env: 'stg' });
      }

      const prodProxy = connector.scoutProtocolBuilderNFT.prod;
      if (prodProxy) {
        proxyOptions.push({ address: prodProxy, env: 'prod' });
      }

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
      const { scoutToken } = await inquirer.prompt([
        {
          type: 'input',
          name: 'scoutToken',
          message: 'Enter the Scout token address:',
          validate: (input: string) => {
            if (!isAddress(input)) {
              return 'Please enter a valid Ethereum address';
            }
            return true;
          }
        }
      ]);

      const { tokenName, tokenSymbol } = await inquirer.prompt([
        {
          type: 'input',
          name: 'tokenName',
          message: 'Enter the token name:',
          validate: (input: string) => {
            const expectedMatch = /^ScoutGame \(Season \d{2}\)/;

            if (!input.match(expectedMatch)) {
              return 'Token name must match the expected format: "ScoutGame (Season XX)"';
            }

            return true;
          }
        },
        {
          type: 'input',
          name: 'tokenSymbol',
          message: 'Enter the token symbol:',
          validate: (input: string) => {
            const expectedMatch = /^SCOUTGAME-S\d{2}$/;

            if (!input.match(expectedMatch)) {
              return 'Token symbol must match the expected format: "SCOUTGAME-SXX"';
            }

            return true;
          }
        }
      ]);

      const tokenDeployArgs = [implementationAddress as Address, scoutToken as Address, proceedsReceiver] as [
        Address,
        Address,
        Address
      ];

      const deployArgs = [...tokenDeployArgs, tokenName, tokenSymbol] as [Address, Address, Address, string, string];

      const newProxyContract = await hre.viem.deployContract('ScoutProtocolBuilderNFTProxy', deployArgs, {
        client: {
          wallet: walletClient
        }
      });

      const proxyAddress = newProxyContract.address;

      console.log('Proxy contract deployed at address:', proxyAddress);

      console.log('Verifying proxy contract with etherscan..');
      try {
        execSync(
          `npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${proxyAddress} ${deployArgs.join(' ')}`
        );
      } catch (err) {
        console.warn('Error verifying contract', err);
      }

      fs.writeFileSync(path.resolve('abis', 'ScoutProtocolProxy.json'), JSON.stringify(newProxyContract.abi, null, 2));
    }
  }
);

module.exports = {};
