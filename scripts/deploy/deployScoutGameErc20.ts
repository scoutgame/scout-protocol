import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import { createPublicClient, createWalletClient, encodeDeployData, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployScoutGameERC20', 'Deploys or updates the BuilderNFTSeasonOne contracts').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    await hre.run('compile');

    const client = createPublicClient({
      chain: connector.chain,
      transport: http(connector.rpcUrl)
    });

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: connector.chain,
      transport: http(connector.rpcUrl)
    });

    console.log('Using account:', account.address, 'on chain:', connector.chain.name);

    // Deploy the implementation contract first
    console.log('Deploying the ERC20 contract...');

    const implementationArtifactPath = path.resolve(
      __dirname,
      '../../artifacts/contracts/protocol/ScoutGameERC20Token.sol/ScoutGameERC20Token.json'
    );
    const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
    const implementationBytecode = implementationArtifact.bytecode;
    const implementationABI = implementationArtifact.abi;

    // console.log(implementationABI)

    const args = ['Points', 'POINT'];

    const encodedDeployData = encodeDeployData({
      abi: implementationABI,
      bytecode: implementationBytecode,
      args
    });

    const deployTx = await walletClient.sendTransaction({
      data: encodedDeployData
    });

    const deployReceipt = await client.waitForTransactionReceipt({ hash: deployTx });
    const erc20Address = deployReceipt.contractAddress;

    if (!erc20Address) {
      throw new Error('Failed to deploy erc20 contract');
    }

    console.log('Implementation contract deployed at address:', erc20Address);

    // Verify contract in the explorer

    console.log('Verifying implementation with etherscan');
    try {
      execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${erc20Address} ${args.join(' ')}`);
    } catch (err) {
      console.warn('Error verifying contract', err);
    }

    fs.writeFileSync(
      path.resolve(__dirname, '..', '..', 'abis', 'BuilderNFTSeasonOneImplementation01.json'),
      JSON.stringify(implementationArtifact.abi, null, 2)
    );
  }
);

module.exports = {};
