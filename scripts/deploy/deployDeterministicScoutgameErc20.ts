import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { log } from '@charmverse/core/log';
import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import type { Address } from 'viem';
import {
  createWalletClient,
  encodeAbiParameters,
  encodePacked,
  getAddress,
  http,
  isAddress,
  keccak256,
  publicActions
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getConnectorFromHardhatRuntimeEnvironment, getConnectorKey } from '../../lib/connectors';

/**
 * Computes the deterministic address for a contract using the CREATE2 formula.
 *
 * @param {string} deployerAddress - The address of the contract calling CREATE2 (deployer address)
 * @param {string} salt - A 32-byte value used as the "salt" in the CREATE2 address generation
 * @param {string} bytecode - The raw bytecode of the contract to deploy
 * @returns {string} The calculated deterministic contract address
 */
export function computeAddress(deployerAddress: string, salt: string, bytecode: string): Address {
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
  const creationCodeHash = keccak256(bytecode as `0x${string}`);

  // 4. Concatenate the CREATE2 inputs (ff + deployerAddress + salt + creationCodeHash)
  const data = `ff${deployerAddressCleaned}${saltCleaned}${creationCodeHash.slice(2)}`;

  // 5. Hash the data with keccak256
  const hashedData = keccak256(`0x${data}`);

  // 6. Return the last 20 bytes of the hash (skip first 12 bytes = 24 hex characters)
  const contractAddress = `0x${hashedData.slice(26)}`; // Skip 24 hex chars (12 bytes)

  return contractAddress.toLowerCase() as Address;
}

dotenv.config();

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('deployDeterministicScoutGameERC20', 'Deploys or updates the Scout Game ERC20 contract').setAction(
  async (taskArgs, hre) => {
    await hre.run('compile');

    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    if (!isAddress(connector.foundryCreate2Deployer as string)) {
      throw new Error('DETERMINISTIC_DEPLOYER_CONTRACT_DEPLOY_CODE is not a valid address');
    }

    const DETERMINISTIC_DEPLOYER_CONTRACT = connector.foundryCreate2Deployer as Address;

    const filePath = 'artifacts/contracts/protocol/contracts/ERC20/ScoutTokenERC20.sol/ScoutTokenERC20.json';
    // const filePath = 'artifacts/contracts/Greeter.sol/Greeter.json';

    const contract = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));

    const bytecode = contract.bytecode;

    // In case it's just 0x
    if (bytecode.length <= 2) {
      throw new Error('Bytecode is empty');
    }

    log.info('Bytecode len:', bytecode.length);

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: connector.chain,
      transport: http(connector.rpcUrl)
    }).extend(publicActions);

    log.info('Using account:', account.address, 'on chain:', connector.chain.name);

    // Encode the function call with parameters
    const salt = '0x0055cf59f3e8b3721283d1d5b88848fb799cdaaae328fbdd36ff0682012290d6';

    log.info('Salt:', salt);

    const deployArgs = [account.address] as const;

    const encodedArgs = encodeAbiParameters([{ type: 'address' }], deployArgs);

    const bytecodeWithArgs = String(bytecode).concat(encodedArgs.slice(2)) as `0x${string}`;

    const expectedAddress = computeAddress(DETERMINISTIC_DEPLOYER_CONTRACT, salt, bytecodeWithArgs);

    log.info('Expected address:', expectedAddress);

    const encodedData = encodePacked(['bytes32', 'bytes'], [salt, bytecodeWithArgs]);

    log.info('\r\n---------------- Creating transaction ------------------\r\n');

    // Send the transaction with the encoded data
    await walletClient
      .sendTransaction({
        to: DETERMINISTIC_DEPLOYER_CONTRACT,
        data: encodedData as `0x${string}`,
        from: account.address,
        value: BigInt(0)
      })
      .then((_tx) => walletClient.waitForTransactionReceipt({ hash: _tx }));

    log.info('\r\n---------------- Verifying contract ------------------\r\n');

    try {
      execSync(`npx hardhat verify --network ${getConnectorKey(connector.chain.id)} ${getAddress(expectedAddress)}`);
    } catch (err) {
      log.error('Error verifying contract', err);
    }

    log.info('\r\n---------------- Performing interaction ------------------\r\n');

    const deployedContract = await hre.viem.getContractAt('ScoutTokenERC20', expectedAddress);

    const decimals = await deployedContract.read.decimals();

    const balance = await deployedContract.read.balanceOf([account.address]);

    log.info('Deployed contract:', deployedContract.address);
    log.info('Balance:', balance / BigInt(10 ** decimals));
  }
);

module.exports = {};
