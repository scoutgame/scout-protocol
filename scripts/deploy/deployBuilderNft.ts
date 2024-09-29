import dotenv from 'dotenv';
import fs from 'node:fs';
import { task } from 'hardhat/config';
import path from 'node:path';
import { createPublicClient, createWalletClient, encodeDeployData, http, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import inquirer from 'inquirer';


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

    const encodedImplementationData = encodeDeployData({
      abi: implementationABI,
      bytecode: implementationBytecode,
      args: [], // No constructor arguments
    });

    const implementationDeployTx = await walletClient.sendTransaction({
      data: encodedImplementationData,
      gasPrice: await client.getGasPrice(),
    });

    

    const implementationReceipt = await client.waitForTransactionReceipt({ hash: implementationDeployTx });
    const implementationAddress = implementationReceipt.contractAddress;

    fs.writeFileSync(path.resolve(__dirname, '..', '..', 'abis', 'BuilderNFTSeasonOneImplementation01.json'), JSON.stringify(implementationArtifact.abi, null, 2));

    if (!implementationAddress) {
      throw new Error("Failed to deploy implementation contract");
    }

    console.log("Implementation contract deployed at address:", implementationAddress);

    // Check if the proxy contract exists
    let proxyAddress = connector.seasonOneProxy;
    if (proxyAddress) {
      console.log(`Proxy contract exists at address: ${proxyAddress}`);
    } else {
      // Deploy the proxy contract
      console.log("Proxy contract not found. Deploying a new proxy contract...");

      // Deploy the Proxy contract
      const proxyArtifactPath = path.resolve(__dirname, '../../artifacts/contracts/BuilderNFTSeasonOneUpgradeable.sol/BuilderNFTSeasonOneUpgradeable.json');
      const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf8'));
      const proxyBytecode = proxyArtifact.bytecode;
      const proxyABI = proxyArtifact.abi;


      // Initialize the Proxy with the implementation address and ERC20 token address
      const paymentTokenAddress = connector.usdcContract; // ERC20 token address
      if (!paymentTokenAddress) {
        throw new Error("Payment token address (USDC contract) not specified in the connector");
      }

      const encodedProxyData = encodeDeployData({
        abi: proxyABI,
        bytecode: proxyBytecode,
        args: [implementationAddress, paymentTokenAddress],
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

      // Save the ABI
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
        // Interact with the proxy contract to set the new implementation
        console.log('Updating proxy to use the new implementation...');

        const proxyAbi = [parseAbiItem('function setImplementation(address _newImplementation)')];

        const txHash = await walletClient.writeContract({
          address: proxyAddress,
          abi: proxyAbi,
          functionName: 'setImplementation',
          args: [implementationAddress],
        });

        // Wait for the transaction to be confirmed
        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log('Proxy implementation updated. Transaction hash:', receipt.transactionHash);

      } else {
        console.log("Proxy implementation not updated.");
      }
    }

    // Save ABI files and addresses
    console.log("Deployment and update process completed.");
  });

module.exports = {};