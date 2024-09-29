import dotenv from 'dotenv';
import fs from 'fs';
import { task } from 'hardhat/config';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import path from 'path';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactBuilderNFT', 'Interact with BuilderNFT contract via CLI')
  .setAction(async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY as `0x${string}` : `0x${process.env.PRIVATE_KEY}` as `0x${string}`;

    // Prompt the user to choose between admin functions or user functions
    const { functionType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'functionType',
        message: 'Do you want to interact with admin functions or user functions?',
        choices: ['Admin Functions', 'User Functions'],
      },
    ]);

    let contractAddress;
    let abi;

    if (functionType === 'Admin Functions') {
      // Load the Proxy contract ABI and address for admin functions
      contractAddress = connector.seasonOneProxy; // Ensure this is set in your connector
      if (!contractAddress) {
        throw new Error("Proxy contract address not found in connector");
      }
      const proxyArtifactPath = path.resolve(__dirname, '../../artifacts/contracts/BuilderNFTSeasonOneUpgradeable.sol/BuilderNFTSeasonOneUpgradeable.json');
      const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf8'));
      abi = proxyArtifact.abi;
    } else {
      // Load the Implementation ABI but use the proxy address for user functions
      contractAddress = connector.seasonOneProxy; // Users interact with the proxy address
      if (!contractAddress) {
        throw new Error("Proxy contract address not found in connector");
      }
      const implementationArtifactPath = path.resolve(__dirname, '../../artifacts/contracts/BuilderNFTSeasonOneImplementation01.sol/BuilderNFTSeasonOneImplementation01.json');
      const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
      abi = implementationArtifact.abi;
    }

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress, privateKey, abi });
  });

module.exports = {};