import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactSablierVesting', 'Interact with Sablier Vesting contract via CLI').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  if (!connector.scoutProtocol) {
    throw new Error('No scout protocol configuration');
  }

  const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
    ? (process.env.PRIVATE_KEY as `0x${string}`)
    : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

  const choices: string[] = [];

  if (connector.scoutProtocol.prod?.sablierLockup) {
    choices.push(`🟢 Prod ${connector.scoutProtocol.prod.sablierLockup.slice(0, 6)}`);
  }

  if (connector.scoutProtocol.stg?.sablierLockup) {
    choices.push(`🟡 Stg ${connector.scoutProtocol.stg.sablierLockup.slice(0, 6)}`);
  }

  if (connector.scoutProtocol.dev?.sablierLockup) {
    choices.push(`🟡 Dev ${connector.scoutProtocol.dev.sablierLockup.slice(0, 6)}`);
  }

  let mode: 'realContract' | 'stgContract' | 'devContract' = 'realContract';

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
      ? connector.scoutProtocol.prod?.sablierLockup
      : mode === 'stgContract'
        ? connector.scoutProtocol.stg?.sablierLockup
        : connector.scoutProtocol.dev?.sablierLockup;

  if (!contractAddress) {
    throw new Error('Proxy contract address not found in connector');
  }

  const implementationArtifact = await hre.viem.getContractAt('LockupWeeklyStreamCreator', contractAddress);
  const abi = implementationArtifact.abi;

  // Proceed to interact with the contract using the selected ABI and contract address
  await interactWithContract({ hre, contractAddress, privateKey, abi });
});

module.exports = {};
