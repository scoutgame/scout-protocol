import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI

import type { ContractDeploymentEnvironment } from '../../lib/connectors';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactScoutTokenERC20Token', 'Interact with ScoutGame Protocol ERC20 Token contract via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    if (!connector.scoutERC20) {
      throw new Error('ERC20 contract address not found in connector');
    }

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    let mode: ContractDeploymentEnvironment = 'dev';

    const choices: string[] = [];

    if (connector.scoutERC20?.prod) {
      choices.push(`🟢 Prod ${connector.scoutERC20.prod.slice(0, 6)}`);
    }

    if (connector.scoutERC20?.stg) {
      choices.push(`🟡 Stg ${connector.scoutERC20.stg.slice(0, 6)}`);
    }

    if (connector.scoutERC20?.dev) {
      choices.push(`🟡 Dev ${connector.scoutERC20.dev.slice(0, 6)}`);
    }

    // Prompt the user to choose between admin functions or user functions
    const { devOrReal } = await inquirer.prompt([
      {
        type: 'list',
        name: 'devOrReal',
        message: 'Choose environment',
        choices
      }
    ]);

    if (String(devOrReal).startsWith('🟢 Prod')) {
      mode = 'prod';
    } else if (String(devOrReal).startsWith('🟡 Stg')) {
      mode = 'stg';
    } else if (String(devOrReal).startsWith('🟡 Dev')) {
      mode = 'dev';
    }

    const contractAddress = connector.scoutERC20[mode];

    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }

    const contract = await hre.viem.getContractAt('ScoutTokenERC20Implementation', contractAddress);

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi: contract.abi });
  }
);

module.exports = {};
