import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployStargateProtocol', 'Deploys the StargateProtocol contract').setAction(async (taskArgs, hre) => {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  await hre.run('compile');

  const artifactPath = path.resolve(__dirname, '../artifacts/contracts/StargateProtocol.sol/StargateProtocol.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contractBytecode = artifact.bytecode;
  const contractABI = artifact.abi;

  // Replace these addresses with actual deployed contract addresses
  const easAddress = connector.easContract; // Address of the deployed EAS contract
  const tokenAddress = connector.luckyStarCoinContract; // Address of the deployed ERC20 token contract

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

  console.log('Deploying StargateProtocol with the account:', account.address, 'on chain:', connector.chain.name);

  const deployTx = await walletClient.sendTransaction({
    data: (contractBytecode + encodeParams([easAddress, tokenAddress])) as `0x${string}`,
    gasLimit: 6000000n
  });

  const receipt = await client.waitForTransactionReceipt({ hash: deployTx });

  console.log('StargateProtocol deployed to:', receipt.contractAddress);

  fs.writeFileSync(
    path.resolve(__dirname, '..', 'abis', 'StargateProtocol.json'),
    JSON.stringify(contractABI, null, 2)
  );
});

function encodeParams(params: any[]) {
  return params
    .map((param) => {
      if (typeof param === 'string') {
        return param.slice(2).padStart(64, '0');
      } else {
        throw new Error('Unsupported parameter type');
      }
    })
    .join('');
}

module.exports = {};
