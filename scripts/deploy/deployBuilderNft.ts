import dotenv from 'dotenv';
import fs from 'node:fs';
import { task } from 'hardhat/config';
import path from 'node:path';
import { createPublicClient, createWalletClient, encodeDeployData, http, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment, proceedsReceiver, getConnectorKey } from '../../lib/connectors';
import inquirer from 'inquirer';
import {execSync} from 'node:child_process';

dotenv.config();

const PRIVATE_KEY = (process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;

task('deployBuilderNFTSeasonOne', 'Deploys or updates the BuilderNFTSeasonOne contracts')
  .setAction(async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    await hre.run('compile');

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

    console.log("Using account:", account.address, "on chain:", connector.chain.name);

    // Deploy the implementation contract first
    console.log("Deploying the implementation contract...");

    const implementationArtifactPath = path.resolve(__dirname, '../../artifacts/contracts/BuilderNFTSeasonOneImplementation01.sol/BuilderNFTSeasonOneImplementation01.json');
    const implementationArtifact = JSON.parse(fs.readFileSync(implementationArtifactPath, 'utf8'));
    const implementationBytecode = implementationArtifact.bytecode;
    const implementationABI = implementationArtifact.abi;

    // console.log(implementationABI)

    const encodedImplementationData = encodeDeployData({
      abi: implementationABI,
      bytecode: implementationBytecode,
      args: []
    });


    const implementationDeployTx = await walletClient.sendTransaction({
      data: encodedImplementationData
    });


    const implementationReceipt = await client.waitForTransactionReceipt({ hash: implementationDeployTx });
    const implementationAddress = implementationReceipt.contractAddress;

    if (!implementationAddress) {
      throw new Error("Failed to deploy implementation contract");
    }

    console.log("Implementation contract deployed at address:", implementationAddress);

    // Verify contract in the explorer

    try {
      execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${implementationAddress}`)
    } catch (err) {
      console.warn('Error verifying contract', err)
    }

    fs.writeFileSync(path.resolve(__dirname, '..', '..', 'abis', 'BuilderNFTSeasonOneImplementation01.json'), JSON.stringify(implementationArtifact.abi, null, 2));

    // Check if the proxy contract exists
    let proxyAddress = connector.seasonOneProxy;
    if (proxyAddress) {
      console.log(`Proxy contract exists at address: ${proxyAddress}`);
    } else {
      // Deploy the proxy contract
      console.log("Proxy contract not found. Deploying a new proxy contract...");

      const proxyArtifactPath = path.resolve(__dirname, '../../artifacts/contracts/BuilderNFTSeasonOneUpgradeable.sol/BuilderNFTSeasonOneUpgradeable.json');
      const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf8'));
      const proxyBytecode = proxyArtifact.bytecode;
      const proxyABI = proxyArtifact.abi;

      const paymentTokenAddress = connector.usdcContract; // ERC20 token address
      if (!paymentTokenAddress) {
        throw new Error("Payment token address (USDC contract) not specified in the connector");
      }

      const deployArgs = [implementationAddress, paymentTokenAddress, proceedsReceiver];

      const encodedProxyData = encodeDeployData({
        abi: proxyABI,
        bytecode: proxyBytecode,
        args: deployArgs,
      });

      const gasPrice = await client.getGasPrice();

      const proxyDeployTx = await walletClient.sendTransaction({
        data: encodedProxyData,
        gasPrice: gasPrice,
      });

      const proxyReceipt = await client.waitForTransactionReceipt({ hash: proxyDeployTx });

      const contractAddress = proxyReceipt.contractAddress;

      if (!contractAddress) {
        throw new Error(`Failed to deploy proxy`);
      }

      proxyAddress = contractAddress;
      console.log("Proxy contract deployed at address:", proxyAddress);


    try {
      execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${contractAddress} ${deployArgs.join(' ')}`)
    } catch (err) {
      console.warn('Error verifying contract', err)
    }


      fs.writeFileSync(path.resolve(__dirname, '..', '..', 'abis', 'BuilderNFTSeasonOneUpgradeableABI.json'), JSON.stringify(proxyArtifact.abi, null, 2));
    }

    // Prompt the user to update the implementation if the proxy already exists
    if (connector.seasonOneProxy) {
      const { updateImplementation } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'updateImplementation',
          message: 'Do you want to update the proxy to use the new implementation?',
          default: true,
        },
      ]);

      if (updateImplementation) {
        console.log('Updating proxy to use the new implementation...');

        const proxyAbi = [parseAbiItem('function setImplementation(address _newImplementation)')];

        const txHash = await walletClient.writeContract({
          address: proxyAddress,
          abi: proxyAbi,
          functionName: 'setImplementation',
          args: [implementationAddress],
        });

        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log('Proxy implementation updated. Transaction hash:', receipt.transactionHash);
      } else {
        console.log("Proxy implementation not updated.");
      }
    }

    console.log("Deployment and update process completed.");
  });

module.exports = {};