import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactBuilderNFT', 'Interact with BuilderNFT contract via CLI').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
    ? (process.env.PRIVATE_KEY as `0x${string}`)
    : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

  let mode: 'realProxy' | 'stgProxy' | 'devProxy' = 'realProxy';

  const choices: string[] = [`🟢 Prod ${connector.seasonOneProxy!.slice(0, 6)}`];

  if (privateKeyToAccount(privateKey).address.startsWith('0x518')) {
    console.log('🟢 You are connected with the production wallet. Please be careful with the actions you perform.');
  } else {
    console.log('🟡 You are connected with the test wallet');
  }

  if (connector.devProxy) {
    choices.push(`🟡 Stg ${connector.devProxy!.slice(0, 6)}`);
  }

  if (connector.testDevProxy) {
    choices.push(`🟡 Dev ${connector.testDevProxy!.slice(0, 6)}`);
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
    mode === 'realProxy' ? connector.seasonOneProxy : mode === 'stgProxy' ? connector.devProxy : connector.testDevProxy;

  if (!contractAddress) {
    throw new Error('Proxy contract address not found in connector');
  }

  const contract = await hre.viem.getContractAt(
    (functionType === 'Admin Functions'
      ? 'BuilderNFTSeasonOneUpgradeable'
      : 'BuilderNFTSeasonOneImplementation01') as any,
    contractAddress as `0x${string}`
  );

  const abi = contract.abi;

  // Proceed to interact with the contract using the selected ABI and contract address
  await interactWithContract({ hre, contractAddress, privateKey, abi });
});

module.exports = {};
