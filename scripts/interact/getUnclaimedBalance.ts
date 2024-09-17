import { task } from 'hardhat/config';
import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';

dotenv.config();

task('getUnclaimedBalance', 'Fetches the unclaimed balance of an address from StargateProtocol')
  .addParam('address', 'The address to check the unclaimed balance for')
  .setAction(async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);
    const client = createPublicClient({
      chain: connector.chain,
      transport: http(connector.rpcUrl),
    });

    const stargateProtocolAddress = connector.stargateProtocolContract; // Replace with your StargateProtocol contract address
    const accountAddress = taskArgs.address;

    const artifactPath = path.resolve(__dirname, '../artifacts/contracts/StargateProtocol.sol/StargateProtocol.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    const data = encodeFunctionData({
      abi,
      functionName: 'getUnclaimedBalance',
      args: [accountAddress],
    });

    try {
      const response = await client.call({
        to: stargateProtocolAddress,
        data,
      });

      const unclaimedBalance = decodeFunctionResult({
        abi,
        functionName: 'getUnclaimedBalance',
        data: response.data as `0x${string}`,
      });

      console.log(`Unclaimed balance for ${accountAddress}:`, unclaimedBalance);
    } catch (error) {
      console.error('Error fetching unclaimed balance:', error);
    }
  });

module.exports = {};