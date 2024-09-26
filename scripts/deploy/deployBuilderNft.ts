import dotenv from 'dotenv';
import fs from 'fs';
import { task } from 'hardhat/config';
import path from 'path';
import { createPublicClient, createWalletClient, encodeDeployData, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;

task('deployBuilderNFTSeasonOne', 'Deploys the BuilderNFTSeasonOne contract')
  .setAction(async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    await hre.run('compile');

    const artifactPath = path.resolve(__dirname, '../../artifacts/contracts/SeasonOne/BuilderNFTSeasonOne.sol/BuilderNFTSeasonOne.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contractBytecode = artifact.bytecode;
    const contractABI = artifact.abi;

    const client = createPublicClient({
      chain: connector.chain,
      transport: http(connector.rpcUrl),
    });

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: connector.chain,
      transport: http(connector.rpcUrl),
    });

    console.log("Deploying BuilderNFTSeasonOne with the account:", account.address, "on chain:", connector.chain.name);

    // USDC has 6 decimals, so this price is 2 cents
    const basePrice = 2e4;

    const encodedData = encodeDeployData({
      abi: contractABI,
      bytecode: contractBytecode,
      args: ["0x4A29c8fF7D6669618580A68dc691565B07b19e25", basePrice, connector.usdcContract],
    });

    const gasPrice = await client.getGasPrice()

    const deployTx = await walletClient.sendTransaction({
      data: encodedData,
      gasPrice: gasPrice
    });

    const receipt = await client.waitForTransactionReceipt({ hash: deployTx });

    console.log("BuilderNFTSeasonOne deployed to:", receipt.contractAddress);

    fs.writeFileSync(path.resolve(__dirname, '..', '..', 'abis', 'BuilderNFTSeasonOne.json'), JSON.stringify(contractABI, null, 2));
  });


module.exports = {};