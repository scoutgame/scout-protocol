import dotenv from 'dotenv';
import fs from 'fs';
import { task } from 'hardhat/config';
import path from 'path';
import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData, decodeFunctionResult } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { ensureAbisDirectoryExists } from '../../lib/ensureDirectoryExists';
import { getDeterministicDeploySalt, getFactoryFromHardhatRuntimeEnvironment } from '../../lib/deterministicDeploy';
import { PRIVATE_KEY } from '../../lib/constants';
import { prettyPrint } from '../../lib/prettyPrint';

dotenv.config();

task('deployLuckyStarCoin', 'Deploys the LuckyStarCoin contract deterministically using Create2Factory')
  .setAction(async (taskArgs, hre) => {
    ensureAbisDirectoryExists();

    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);
    const factoryAddress = getFactoryFromHardhatRuntimeEnvironment({ hre, type: 'tokenFactory' });

    await hre.run('compile');

    const tokenArtifactPath = path.resolve(__dirname, '../artifacts/contracts/LuckyStarCoin.sol/LuckyStarCoin.json');
    const factoryArtifactPath = path.resolve(__dirname, '../artifacts/contracts/Create2Factory.sol/Create2Factory.json');

    const tokenArtifact = JSON.parse(fs.readFileSync(tokenArtifactPath, 'utf8'));
    const factoryArtifact = JSON.parse(fs.readFileSync(factoryArtifactPath, 'utf8'));

    const tokenABI = tokenArtifact.abi;
    const factoryABI = factoryArtifact.abi;

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

    console.log('Deploying LuckyStarCoin with the account:', account.address, 'on chain:', connector.chain.name);

    const salt = getDeterministicDeploySalt(); // Use a unique salt
    const initialSupply = parseUnits('1000000000', 18); // 1 billion tokens

    const getBytecodeData = encodeFunctionData({
      abi: factoryABI,
      functionName: 'getBytecode',
      args: [account.address, initialSupply],
    });

    const bytecodeResponse = await client.call({
      to: factoryAddress,
      data: getBytecodeData,
    });
    const bytecode = decodeFunctionResult({
      abi: factoryABI,
      functionName: 'getBytecode',
      data: bytecodeResponse.data as `0x${string}`,
    });

    const getAddressData = encodeFunctionData({
      abi: factoryABI,
      functionName: 'getAddress',
      args: [salt, bytecode],
    });

    const predictedAddressResponse = await client.call({
      to: factoryAddress,
      data: getAddressData,
    });
    const predictedAddress = decodeFunctionResult({
      abi: factoryABI,
      functionName: 'getAddress',
      data: predictedAddressResponse.data as `0x${string}`,
    });
    console.log('Predicted LuckyStarCoin contract address:', predictedAddress);

    const deployTxData = encodeFunctionData({
      abi: factoryABI,
      functionName: 'deploy',
      args: [salt, bytecode],
    });

    const deployTx = await walletClient.sendTransaction({
      to: factoryAddress,
      data: deployTxData,
      gasLimit: 6000000n,
    });

    const receipt = await client.waitForTransactionReceipt({ hash: deployTx });
    console.log('LuckyStarCoin deployed to:', predictedAddress, 'on chain:', connector.chain.name);

    prettyPrint(receipt);


    fs.writeFileSync(path.resolve(__dirname, '..', 'abis', 'tokenABI.json'), JSON.stringify(tokenABI, null, 2));
  });

module.exports = {};