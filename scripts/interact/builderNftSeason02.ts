import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { privateKeyToAccount } from 'viem/accounts';

import type { ContractDeploymentEnvironment } from '../../lib/connectors';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactBuilderNFTPreSeason02', 'Interact with BuilderNFT Season 02 contract via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    const choices: string[] = [];

    if (privateKeyToAccount(privateKey).address.startsWith('0x518')) {
      console.log('🟢 You are connected with the production wallet. Please be careful with the actions you perform.');
    } else {
      console.log('🟡 You are connected with the test wallet');
    }

    if (connector.preseason02Nft?.prod?.preseason02Nft) {
      choices.push(`🟢 Prod ${connector.preseason02Nft?.prod?.preseason02Nft!.slice(0, 6)}`);
    }

    if (connector.preseason02Nft?.stg?.preseason02Nft) {
      choices.push(`🟡 Stg ${connector.preseason02Nft?.stg?.preseason02Nft!.slice(0, 6)}`);
    }

    if (connector.preseason02Nft?.dev?.preseason02Nft) {
      choices.push(`🟡 Dev ${connector.preseason02Nft?.dev?.preseason02Nft!.slice(0, 6)}`);
    }

    // Prompt the user to choose between admin functions or user functions
    let { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Choose environment',
        choices
      }
    ]);

    if (String(mode).startsWith('🟢 Prod')) {
      mode = 'prod';
    } else if (String(mode).startsWith('🟡 Stg')) {
      mode = 'stg';
    } else {
      mode = 'dev';
    }

    // Prompt the user to choose between admin functions or user functions
    const { functionType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'functionType',
        message: 'Do you want to interact with admin functions or user functions?',
        choices: ['Admin Functions', 'User Functions']
      }
    ]);

    const contractAddress = connector.preseason02Nft?.[mode as ContractDeploymentEnvironment]?.preseason02Nft;

    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }

    const contract = await hre.viem.getContractAt(
      (functionType === 'Admin Functions'
        ? 'BuilderNFTPreSeason02Upgradeable'
        : 'BuilderNFTPreSeason02Implementation') as any,
      contractAddress as `0x${string}`
    );

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi: contract.abi });
  }
);

module.exports = {};
