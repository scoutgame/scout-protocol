import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { Contract } from 'ethers';
import { task } from 'hardhat/config';
import type { Abi, Address } from 'viem';
import {
  createWalletClient,
  encodeAbiParameters,
  encodeDeployData,
  encodePacked,
  http,
  parseEventLogs,
  publicActions,
  keccak256,
  toHex,
  pad
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey } from '../../lib/connectors';
import { DETERMINISTIC_DEPLOYER_CONTRACT } from '../../lib/constants';

/**
 * Computes the deterministic address for a contract using the CREATE2 formula.
 *
 * @param {string} deployerAddress - The address of the contract calling CREATE2 (deployer address)
 * @param {string} salt - A 32-byte value used as the "salt" in the CREATE2 address generation
 * @param {string} bytecode - The raw bytecode of the contract to deploy
 * @returns {string} The calculated deterministic contract address
 */
export function computeAddress(deployerAddress: string, salt: string, bytecode: string): string {
  // 1. Ensure deployer address is 20 bytes (40 hex characters)
  const deployerAddressCleaned = deployerAddress.toLowerCase().replace(/^0x/, '');
  if (deployerAddressCleaned.length !== 40) {
    throw new Error(
      `Deployer address must be 20 bytes (40 hex characters), but got ${deployerAddressCleaned.length} characters`
    );
  }

  // 2. Ensure salt is 32 bytes (64 hex characters)
  const saltCleaned = salt.toLowerCase().replace(/^0x/, '');
  if (saltCleaned.length !== 64) {
    throw new Error(`Salt must be 32 bytes (64 hex characters), but got ${saltCleaned.length} characters`);
  }

  // 3. Calculate the keccak256 hash of the contract's bytecode
  const creationCodeHash = keccak256(bytecode.replace(/^0x/, ''));

  // 4. Concatenate the CREATE2 inputs (ff + deployerAddress + salt + creationCodeHash)
  const data = `ff${deployerAddressCleaned}${saltCleaned}${creationCodeHash.slice(2)}`;

  // 5. Hash the data with keccak256
  const hashedData = keccak256(`0x${data}`);

  console.log('Hashed data:', hashedData);
  console.log('Hashed data length:', hashedData.length);

  // 6. Return the last 20 bytes of the hash (skip first 12 bytes = 24 hex characters)
  const contractAddress = `0x${hashedData.slice(26)}`; // Skip 24 hex chars (12 bytes)

  return contractAddress.toLowerCase();
}

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

    // Randomly generate a salt while we test deployment
    function generateRandomBytes32Salt(): `0x${string}` {
      // Generate 64 random hexadecimal characters (since 1 byte = 2 hex characters)
      const randomHex = Array.from(
        { length: 64 },
        () => Math.floor(Math.random() * 16).toString(16) // Random hex digit (0-15)
      ).join('');

      // Prefix with '0x' to match the bytes32 format
      return `0x${randomHex}`;
    }

    // Encode the function call with parameters
    // const salt = '0x100000000000000000000000033B9BbB7B33286A08CafaFF9Ac259F6D53B4CD4';
    const salt = generateRandomBytes32Salt();
    const data = encodeDeployData({
      abi,
      bytecode,
      args: []
    });

    const expectedAddress = computeAddress(DETERMINISTIC_DEPLOYER_CONTRACT, salt, bytecode);

    console.log('Expected address:', expectedAddress);

    const encodedData = encodePacked(['bytes32', 'bytes'], [salt, bytecode]);

    // Send the transaction with the encoded data

    // const tx = await walletClient.sendTransaction({
    //   to: DETERMINISTIC_DEPLOYER_CONTRACT,
    //   data: encodedData as `0x${string}`,
    //   from: account.address,
    //   value: BigInt(0)
    // });

    // const result = await walletClient.call({
    //   to: DETERMINISTIC_DEPLOYER_CONTRACT,
    //   data: encodedData as `0x${string}`
    // });

    const result = await walletClient.writeContract({
      address: DETERMINISTIC_DEPLOYER_CONTRACT,
      abi: [
        {
          type: 'function',
          name: 'deploy',
          inputs: [
            { name: 'salt', type: 'bytes32' },
            { name: 'bytecode', type: 'bytes' }
          ],
          outputs: [{ name: 'deployedAddress', type: 'address' }],
          stateMutability: 'nonpayable'
        }
      ],
      functionName: 'deploy',
      args: [salt, bytecode]
    });
    console.log('Result:', result);

    const receipt = await walletClient.waitForTransactionReceipt({ hash: result as `0x${string}` });

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
