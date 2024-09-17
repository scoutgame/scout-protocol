import { task } from 'hardhat/config';
import { createPublicClient, createWalletClient, http, encodeFunctionData, decodeFunctionResult, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getConnectorFromHardhatRuntimeEnvironment } from '../lib/connectors';
import { prettyPrint } from '../lib/prettyPrint';

dotenv.config();

task('claimBalance', 'Claims the balance from StargateProtocol')
  .addParam('privatekey', 'The private key of the signer')
  .setAction(async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);
    const client = createPublicClient({
      chain: connector.chain,
      transport: http(connector.rpcUrl),
    });

    const privateKey = taskArgs.privatekey;
    const walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: connector.chain,
      transport: http(connector.rpcUrl),
    });

    const signer = walletClient.account;
    console.log('Signer address:', signer.address);

    const stargateProtocolAddress = connector.stargateProtocolContract; // Replace with your StargateProtocol contract address

    const artifactPath = path.resolve(__dirname, '../artifacts/contracts/StargateProtocol.sol/StargateProtocol.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    // Step 1: Fetch the claimable balance
    const getBalanceData = encodeFunctionData({
      abi,
      functionName: 'getUnclaimedBalance',
      args: [getAddress(signer.address)],
    });

    try {
      const balanceResponse = await client.call({
        to: stargateProtocolAddress,
        data: getBalanceData,
      });

      const claimableBalance = (decodeFunctionResult({
        abi,
        functionName: 'getUnclaimedBalance',
        data: balanceResponse.data as `0x${string}`,
      }) as any) as bigint; // Get the first element from the decoded result which is the balance

      prettyPrint(claimableBalance)

      console.log(`Claimable balance for ${signer.address}:`, claimableBalance.toString());

      if (claimableBalance > 0n) {
        // Step 2: Claim the balance
        const claimBalanceData = encodeFunctionData({
          abi,
          functionName: 'claimBalance',
          args: [claimableBalance],
        });

        const tx = await walletClient.sendTransaction({
          to: stargateProtocolAddress,
          data: claimBalanceData,
          gasLimit: 600000n,
        });

        const receipt = await client.waitForTransactionReceipt({ hash: tx });

        console.log('Claim transaction receipt:', receipt);
      } else {
        console.log(`No balance to claim for ${signer.address}.`);
      }
    } catch (error) {
      console.error('Error during claim process:', error);
    }
  });

module.exports = {};