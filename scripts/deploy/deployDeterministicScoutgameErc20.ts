import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { Contract } from 'ethers';
import { task } from 'hardhat/config';
import type { Abi } from 'viem';
import {
  createWalletClient,
  encodeAbiParameters,
  encodeDeployData,
  encodePacked,
  http,
  parseEventLogs,
  publicActions
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey } from '../../lib/connectors';
import { DETERMINISTIC_DEPLOYER_CONTRACT } from '../../lib/constants';

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployDeterministicScoutGameERC20', 'Deploys or updates the Scout Game ERC20 contract').setAction(
  async (taskArgs, hre) => {
    await hre.run('compile');

    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    // const filePath = 'artifacts/contracts/protocol/contracts/ERC20/ScoutTokenERC20.sol/ScoutTokenERC20.json';
    const filePath = 'artifacts/contracts/Greeter.sol/Greeter.json';

    const contract = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));

    const bytecode = contract.bytecode;

    console.log('Bytecode:', bytecode.length);

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: connector.chain,
      transport: http(connector.rpcUrl)
    }).extend(publicActions);

    console.log('Using account:', account.address, 'on chain:', connector.chain.name);

    // Assuming you have the ABI of the DeterministicDeployer contract

    const abi: Abi = [
      {
        name: 'deploy',
        type: 'function',
        inputs: [
          { name: 'salt', type: 'bytes32' },
          { name: 'bytecode', type: 'bytes' }
        ],
        stateMutability: 'nonpayable',
        outputs: []
      }
    ];

    // Encode the function call with parameters
    const salt = '0x000000000000000000000000033B9BbB7B33286A08CafaFF9Ac259F6D53B4CC5';

    const data = encodeDeployData({
      abi,
      bytecode,
      args: []
    });

    const encodedData = encodePacked(['bytes32', 'bytes'], [salt, bytecode]);

    // Send the transaction with the encoded data

    const tx = await walletClient.sendTransaction({
      to: DETERMINISTIC_DEPLOYER_CONTRACT,
      data: encodedData as `0x${string}`,
      from: account.address,
      value: BigInt(0)
    });

    const receipt = await walletClient.waitForTransactionReceipt({ hash: tx });

    console.log('Receipt:', receipt);

    // const erc20Address = deployedErc20.address;

    // if (!erc20Address) {
    //   throw new Error('Failed to deploy erc20 contract');
    // }

    // console.log('Implementation contract deployed at address:', erc20Address);

    // // Verify contract in the explorer

    // console.log('Verifying implementation with etherscan');
    // try {
    //   execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${erc20Address}`);
    // } catch (err) {
    //   console.warn('Error verifying contract', err);
    // }

    // console.log('Writing ABI to file');

    // fs.writeFileSync(
    //   path.resolve(__dirname, '..', '..', 'abis', 'ScoutTokenERC20.json'),
    //   JSON.stringify(deployedErc20.abi, null, 2)
    // );

    // console.log('Complete');
  }
);

module.exports = {};
