import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactBuilderNFTSeason02', 'Interact with BuilderNFT Season 02 contract via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    let mode: 'realProxy' | 'stgProxy' | 'devProxy' = 'realProxy';

    const choices: string[] = [];

    if (privateKeyToAccount(privateKey).address.startsWith('0x518')) {
      console.log('🟢 You are connected with the production wallet. Please be careful with the actions you perform.');
    } else {
      console.log('🟡 You are connected with the test wallet');
    }

    if (connector.scoutProtocol?.prod?.season02NFT) {
      choices.push(`🟢 Prod ${connector.scoutProtocol?.prod?.season02NFT!.slice(0, 6)}`);
    }

    if (connector.scoutProtocol?.stg?.season02NFT) {
      choices.push(`🟡 Stg ${connector.scoutProtocol?.stg?.season02NFT!.slice(0, 6)}`);
    }

    if (connector.scoutProtocol?.dev?.season02NFT) {
      choices.push(`🟡 Dev ${connector.scoutProtocol?.dev?.season02NFT!.slice(0, 6)}`);
    }

    // Prompt the user to choose between admin functions or user functions
    const { stgOrReal } = await inquirer.prompt([
      {
        type: 'list',
        name: 'stgOrReal',
        message: 'Choose environment',
        choices
      }
    ]);

    if (String(stgOrReal).startsWith('🟢 Prod')) {
      mode = 'realProxy';
    } else if (String(stgOrReal).startsWith('🟡 Stg')) {
      mode = 'stgProxy';
    } else {
      mode = 'devProxy';
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

    const contractAddress =
      mode === 'realProxy'
        ? connector.scoutProtocol?.prod?.season02NFT
        : mode === 'stgProxy'
          ? connector.scoutProtocol?.stg?.season02NFT
          : connector.scoutProtocol?.dev?.season02NFT;

    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }

    const contract = await hre.viem.getContractAt(
      (functionType === 'Admin Functions'
        ? 'BuilderNFTSeason02Upgradeable'
        : 'BuilderNFTSeason02Implementation') as any,
      contractAddress as `0x${string}`
    );

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi: contract.abi });
  }
);

module.exports = {};
