import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { privateKeyToAccount } from 'viem/accounts';

import { ScoutProtocolEASResolverClient as _ScoutProtocolEASResolverClient } from '../../lib/apiClients/ScoutProtocolEASResolverClient';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { getWalletClient } from '../../lib/getWalletClient';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactProtocolEASResolver', 'Interact with ScoutGame Protocol EAS Resolver via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    if (!connector.scoutgameScoutProtocolProxy) {
      throw new Error('Proxy contract address not found in connector');
    }

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    let mode: 'realContract' | 'devContract' = 'realContract';

    const choices: string[] = [`🟢 Prod ${connector.scoutgameEASResolver!.slice(0, 6)}`];

    if (connector.scoutgameEASResolverDev) {
      choices.push(`🟡 Dev ${connector.scoutgameEASResolverDev.slice(0, 6)}`);
    }

    const ScoutProtocolERC20Client = new _ScoutProtocolEASResolverClient({
      chain: connector.chain,
      contractAddress: connector.scoutgameEASResolver as `0x${string}`,
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

    const contractAddress =
      mode === 'realContract' ? connector.scoutgameEASResolver : connector.scoutgameEASResolverDev;

    if (!contractAddress) {
      throw new Error('Proxy contract address not found in connector');
    }

    const implementationArtifactPath = path.resolve(
      __dirname,
      '../../artifacts/contracts/protocol/ProtocolEASResolver.sol/ProtocolEASResolver.json'
    );
    const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
    const abi = implementationArtifact.abi;

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi });
  }
);

module.exports = {};
