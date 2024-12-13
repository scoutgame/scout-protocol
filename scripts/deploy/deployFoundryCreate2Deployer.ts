import dotenv from 'dotenv';
import { task } from 'hardhat/config';
import { isAddress } from 'viem';

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { DETERMINISTIC_DEPLOYER_CONTRACT_DEPLOY_CODE } from '../../lib/constants';
import { getWalletClient } from '../../lib/getWalletClient';

dotenv.config();

task('deployFoundryCreate2Deployer', 'Deploys or updates the Scout Game ERC20 contract').setAction(
  async (taskArgs, hre) => {
    await hre.run('compile');

    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    const walletClient = getWalletClient({
      privateKey: process.env.PRIVATE_KEY as string,
      chain: connector.chain,
      rpcUrl: connector.rpcUrl
    });

    // Send the transaction with the encoded data
    const receipt = await walletClient
      .deployContract({
        abi: [],
        bytecode: DETERMINISTIC_DEPLOYER_CONTRACT_DEPLOY_CODE as `0x${string}`,
        value: BigInt(0)
      })
      .then((_tx) => walletClient.waitForTransactionReceipt({ hash: _tx }));

    const contractAddress = receipt.contractAddress;

    if (!isAddress(contractAddress as string)) {
      throw new Error('Contract address is not a valid address');
    }

    console.log('Contract address:', contractAddress);
  }
);

module.exports = {};
