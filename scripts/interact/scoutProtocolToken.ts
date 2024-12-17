import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactProtocolERC20Token', 'Interact with ScoutGame Protocol ERC20 Token contract via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    if (!connector.scoutERC20) {
      throw new Error('ERC20 contract address not found in connector');
    }

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    let mode: 'realContract' | 'stgContract' | 'devContract' = 'realContract';

    const choices: string[] = [];

    if (connector.scoutERC20?.prod?.scoutERC20) {
      choices.push(`🟢 Prod ${connector.scoutERC20.prod.scoutERC20.slice(0, 6)}`);
    }

    if (connector.scoutERC20?.stg?.scoutERC20) {
      choices.push(`🟡 Stg ${connector.scoutERC20.stg.scoutERC20.slice(0, 6)}`);
    }

    if (connector.scoutERC20?.dev?.scoutERC20) {
      choices.push(`🟡 Dev ${connector.scoutERC20.dev.scoutERC20.slice(0, 6)}`);
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
      mode = 'realContract';
    } else if (String(devOrReal).startsWith('🟡 Stg')) {
      mode = 'stgContract';
    } else if (String(devOrReal).startsWith('🟡 Dev')) {
      mode = 'devContract';
    }

    const contractAddress =
      mode === 'realContract'
        ? connector.scoutERC20?.prod?.scoutERC20
        : mode === 'stgContract'
          ? connector.scoutERC20?.stg?.scoutERC20
          : connector.scoutERC20?.dev?.scoutERC20;

    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }

    const contract = await hre.viem.getContractAt('ScoutTokenERC20', contractAddress);

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi: contract.abi });
  }
);

module.exports = {};
