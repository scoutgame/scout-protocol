import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer';
import { createPublicClient, createWalletClient, http, isAddress, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('updateProxyImplementation', 'Deploys or updates the BuilderNFTSeasonOne contracts').setAction(
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

    // Prompt the user to update the implementation if the proxy already exists
    if (connector.seasonOneProxy || connector.testDevProxy || connector.devProxy) {
      const { newContract } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newContract',
          message: 'Enter new implementation address:',
          validate: (value) => {
            if (!isAddress(value)) {
              return `Valid address required`;
            }
            return true;
          }
        }
      ]);

      console.log(newContract);

      const proxyOptions = [
        { address: connector.seasonOneProxy, env: 'prod' },
        { address: connector.devProxy, env: 'staging' },
        { address: connector.testDevProxy, env: 'dev' }
      ].filter((val) => isAddress(val.address as any));

      const { selectedProxy } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProxy',
          message: 'Select a proxy contract to use:',
          choices: proxyOptions.map((opt) => `${opt.env}:: ${opt.address!.slice(0, 6)}`)
        }
      ]);

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
          default: true
        }
      ]);

      if (updateImplementation) {
        console.log('Updating proxy to use the new implementation...');

        const proxyAbi = [parseAbiItem('function setImplementation(address _newImplementation)')];

        const txHash = await walletClient.writeContract({
          address: proxyToUpdate,
          abi: proxyAbi,
          functionName: 'setImplementation',
          args: [newContract]
        });

        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log('Proxy implementation updated. Transaction hash:', receipt.transactionHash);
      } else {
        console.log('Proxy implementation not updated.');
      }
    }

    console.log('Deployment and update process completed.');
  }
);

module.exports = {};
