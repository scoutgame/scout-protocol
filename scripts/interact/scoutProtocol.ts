import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { privateKeyToAccount } from 'viem/accounts';

import { ScoutProtocolProxyClient as _ScoutProtocolProxyClient } from '../../lib/apiClients/ProtocolProxyClient';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { getWalletClient } from '../../lib/getWalletClient';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactProtocol', 'Interact with ScoutGame Protocol contract via CLI').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  if (!connector.scoutgameScoutProtocolProxy) {
    throw new Error('Proxy contract address not found in connector');
  }

  const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
    ? (process.env.PRIVATE_KEY as `0x${string}`)
    : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

  let mode: 'realProxy' | 'devProxy' = 'realProxy';

  const choices: string[] = [`🟢 Prod ${connector.scoutgameScoutProtocolProxy!.slice(0, 6)}`];

  if (connector.scoutgameScoutProtocolProxyDev) {
    choices.push(`🟡 Dev ${connector.scoutgameScoutProtocolProxyDev.slice(0, 6)}`);
  }

  const ScoutProtocolProxyClient = new _ScoutProtocolProxyClient({
    chain: connector.chain,
    contractAddress: connector.scoutgameScoutProtocolProxy,
    walletClient: getWalletClient({ chain: connector.chain, privateKey, rpcUrl: connector.rpcUrl })
  });

  const currentAccount = privateKeyToAccount(privateKey);

  const currentAdmin = await ScoutProtocolProxyClient.admin();

  if (currentAccount.address === currentAdmin) {
    console.log('ℹ️ You are connected with the production wallet. Please be careful with the actions you perform.');
  } else {
    console.log('🟡 You are connected with the test wallet');
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
    mode = 'realProxy';
  } else if (String(devOrReal).startsWith('🟡 Dev')) {
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
    mode === 'realProxy' ? connector.scoutgameScoutProtocolProxy : connector.scoutgameScoutProtocolProxyDev;
  let abi;

  if (!contractAddress) {
    throw new Error('Proxy contract address not found in connector');
  }

  if (functionType === 'Admin Functions') {
    // Load the Proxy contract ABI and address for admin functions

    const proxyArtifactPath = path.resolve(
      __dirname,
      '../../artifacts/contracts/protocol/ScoutProtocolProxy.sol/ScoutProtocolProxy.json'
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
      '../../artifacts/contracts/protocol/ProtocolImplementation.sol/ScoutProtocolImplementation.json'
    );
    const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
    abi = implementationArtifact.abi;
  }

  // Proceed to interact with the contract using the selected ABI and contract address
  await interactWithContract({ hre, contractAddress, privateKey, abi });
});

module.exports = {};
