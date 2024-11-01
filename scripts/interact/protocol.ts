import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactProtocol', 'Interact with ScoutGame Protocol contract via CLI').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  if (!connector.scoutgameProtocolProxy) {
    throw new Error('Proxy contract address not found in connector');
  }

  const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
    ? (process.env.PRIVATE_KEY as `0x${string}`)
    : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

  // let mode: 'realProxy' | 'stgProxy' | 'devProxy' = 'realProxy';

  // const choices: string[] = [`🟢 Prod ${connector.seasonOneProxy!.slice(0, 6)}`];

  // if (privateKeyToAccount(privateKey).address.startsWith('0x518')) {
  //   console.log('🟢 You are connected with the production wallet. Please be careful with the actions you perform.');
  // } else {
  //   console.log('🟡 You are connected with the test wallet');
  // }

  // if (connector.devProxy) {
  //   choices.push(`🟡 Stg ${connector.devProxy!.slice(0, 6)}`);
  // }

  // if (connector.testDevProxy) {
  //   choices.push(`🟡 Dev ${connector.testDevProxy!.slice(0, 6)}`);
  // }

  // // Prompt the user to choose between admin functions or user functions
  // const { stgOrReal } = await inquirer.prompt([
  //   {
  //     type: 'list',
  //     name: 'stgOrReal',
  //     message: 'Choose environment',
  //     choices
  //   }
  // ]);

  // if (String(stgOrReal).startsWith('🟢 Prod')) {
  //   mode = 'realProxy';
  // } else if (String(stgOrReal).startsWith('🟡 Stg')) {
  //   mode = 'stgProxy';
  // } else {
  //   mode = 'devProxy';
  // }

  // Prompt the user to choose between admin functions or user functions
  const { functionType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'functionType',
      message: 'Do you want to interact with admin functions or user functions?',
      choices: ['Admin Functions', 'User Functions']
    }
  ]);

  const contractAddress = connector.scoutgameProtocolProxy;
  // mode === 'realProxy' ? connector.seasonOneProxy : mode === 'stgProxy' ? connector.devProxy : connector.testDevProxy;
  let abi;

  if (!contractAddress) {
    throw new Error('Proxy contract address not found in connector');
  }

  if (functionType === 'Admin Functions') {
    // Load the Proxy contract ABI and address for admin functions

    const proxyArtifactPath = path.resolve(
      __dirname,
      '../../artifacts/contracts/protocol/ProtocolProxy.sol/ProtocolProxy.json'
    );
    const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf8'));
    abi = proxyArtifact.abi;
  } else {
    // Load the Implementation ABI but use the proxy address for user functions
    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }
    const implementationArtifactPath = path.resolve(
      __dirname,
      '../../artifacts/contracts/protocol/ProtocolImplementation.sol/ProtocolImplementation.json'
    );
    const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
    abi = implementationArtifact.abi;
  }

  // Proceed to interact with the contract using the selected ABI and contract address
  await interactWithContract({ hre, contractAddress, privateKey, abi });
});

module.exports = {};
