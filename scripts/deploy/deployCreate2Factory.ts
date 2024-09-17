import dotenv from 'dotenv';
import fs from 'fs';
import { task } from 'hardhat/config';
import path from 'path';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { ensureAbisDirectoryExists } from '../../lib/ensureDirectoryExists';
import { PRIVATE_KEY } from '../../lib/constants';

dotenv.config();


task('deployCreate2Factory', 'Deploys the Create2Factory contract').setAction(async (taskArgs, hre) => {
  ensureAbisDirectoryExists();

  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  await hre.run('compile');

  const artifactPath = path.resolve(__dirname, '../artifacts/contracts/Create2Factory.sol/Create2Factory.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const factoryBytecode = artifact.bytecode;
  const factoryABI = artifact.abi;

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

  console.log("Deploying contracts with the account:", account.address, 'on chain', connector.chain.name);

  const deployTx = await walletClient.sendTransaction({
    data: factoryBytecode,
    gas: 6000000n,
  });

  const receipt = await client.waitForTransactionReceipt({hash: deployTx});
  console.log("Factory deployed to:", receipt.contractAddress, 'on chain', connector.chain.name);

  fs.writeFileSync(path.resolve(__dirname, '..', 'abis', 'factoryABI.json'), JSON.stringify(factoryABI, null, 2));
});

module.exports = {};