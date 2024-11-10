import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { privateKeyToAccount } from 'viem/accounts';

import { ProtocolERC20TokenClient as _ProtocolERC20TokenClient } from '../../lib/apiClients/ProtocolERC20TokenClient';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { getWalletClient } from '../../lib/getWalletClient';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactProtocolERC20Token', 'Interact with ScoutGame Protocol ERC20 Token contract via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    if (!connector.scoutgameScoutProtocolProxy) {
      throw new Error('Proxy contract address not found in connector');
    }

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    let mode: 'realContract' | 'devContract' = 'realContract';

    const choices: string[] = [`🟢 Prod ${connector.scoutgameErc20Token!.slice(0, 6)}`];

    if (connector.scoutgameErc20TokenDev) {
      choices.push(`🟡 Dev ${connector.scoutgameErc20TokenDev.slice(0, 6)}`);
    }

    const ScoutProtocolERC20Client = new _ProtocolERC20TokenClient({
      chain: connector.chain,
      contractAddress: connector.scoutgameErc20Token as `0x${string}`,
      walletClient: getWalletClient({ chain: connector.chain, privateKey, rpcUrl: connector.rpcUrl })
    });

    const currentAccount = privateKeyToAccount(privateKey);

    const currentAdmin = await ScoutProtocolERC20Client.admin();

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
      mode = 'realContract';
    } else if (String(devOrReal).startsWith('🟡 Dev')) {
      mode = 'devContract';
    }

    const contractAddress = mode === 'realContract' ? connector.scoutgameErc20Token : connector.scoutgameErc20TokenDev;

    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }

    const implementationArtifactPath = path.resolve(
      __dirname,
      '../../artifacts/contracts/protocol/ScoutTokenERC20.sol/ScoutTokenERC20.json'
    );
    const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
    const abi = implementationArtifact.abi;

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi });
  }
);

module.exports = {};
