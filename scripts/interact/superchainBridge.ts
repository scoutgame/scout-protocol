import dotenv from 'dotenv';
import { task } from 'hardhat/config';

import { getConnectorFromHardhatRuntimeEnvironment } from '../../lib/connectors';
import { interactWithContract } from '../../lib/interactWithContract';

dotenv.config();

task('interactSuperchainBridge', 'Interact with Superchain Bridge contract via CLI').setAction(
  async (taskArgs, hre) => {
    const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

    if (!connector.superchainBridge) {
      throw new Error('Superchain Bridge contract address not found in connector');
    }

    const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
      ? (process.env.PRIVATE_KEY as `0x${string}`)
      : (`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    const contract = await hre.viem.getContractAt(
      'contracts/protocol/contracts/ERC20/ISuperchainBridge.sol:ISuperchainBridge',
      connector.superchainBridge
    );

    // Proceed to interact with the contract using the selected ABI and contract address
    await interactWithContract({ hre, contractAddress: contract.address, privateKey, abi: contract.abi });
  }
);

module.exports = {};
