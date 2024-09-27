import { task } from 'hardhat/config';
import { createPublicClient, createWalletClient, http, encodeFunctionData, decodeFunctionResult, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';  // Importing inquirer for interactive CLI
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

/*
token 1: 0.001
token 2: 0.002

// Total: 0.012
token 3: 0.003
token 4: 0.004
token 5: 0.005

 */

task('interactBuilderNFT', 'Interact with BuilderNFT contract via CLI')
  // .addParam('privatekey', 'The private key of the signer')
  .setAction(async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);


    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY as `0x${string}` : `0x${process.env.PRIVATE_KEY}` as `0x${string}`;

    // Load the BuilderNFT contract ABI and address
    const builderNFTAddress = connector.builderNFTContract; // Replace with your BuilderNFT contract address
    const artifactPath = path.resolve(__dirname, '../../artifacts/contracts/BuilderNFTSeasonOne.sol/BuilderNFTSeasonOne.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    await interactWithContract({ hre, contractAddress: builderNFTAddress, privateKey, abi });
  });

module.exports = {};