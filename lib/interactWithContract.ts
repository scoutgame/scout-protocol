import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { Address, createWalletClient, decodeFunctionResult, encodeFunctionData, getAddress, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment } from './connectors';
/*
token 1: 0.001
token 2: 0.002

// Total: 0.012
token 3: 0.003
token 4: 0.004
token 5: 0.005

 */
export async function interactWithContract({hre, contractAddress, privateKey, abi}: {hre: HardhatRuntimeEnvironment, contractAddress: Address, privateKey: `0x${string}`, abi: any}) {
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: connector.chain,
    transport: http(connector.rpcUrl),
  }).extend(publicActions);

  const signer = walletClient.account;
  console.log('Signer address:', signer.address);

  // List available contract methods
  const contractMethods = abi.filter((item: any) => item.type === 'function');

  // Show contract methods in CLI
  console.log("Available contract methods:");
  contractMethods.forEach((method: any, index: number) => {
    console.log(`${index + 1}. ${method.name}`);
  });

  // Use inquirer to interactively ask the user to select a method
  const { selectedMethodIndex } = await inquirer.prompt([
    {
      type: 'input',
      name: 'selectedMethodIndex',
      message: 'Enter the number of the method you want to call:',
      validate: (input) => {
        const index = parseInt(input, 10);
        return index > 0 && index <= contractMethods.length ? true : 'Invalid method number';
      },
    },
  ]);

  const methodIndex = parseInt(selectedMethodIndex, 10) - 1;
  const selectedMethod = contractMethods[methodIndex];

  // Get the required arguments for the selected method
  if (selectedMethod.inputs.length > 0) {
    console.log(`You selected the method: ${selectedMethod.name}`);
    console.log("This method requires the following arguments:");

    selectedMethod.inputs.forEach((input: any, index: number) => {
      console.log(`${index + 1}. ${input.name} (${input.type})`);
    });

    // Prompt the user to enter the required arguments
    const args = await inquirer.prompt(
      selectedMethod.inputs.map((input: any, index: number) => ({
        type: 'input',
        name: input.name,
        message: `Enter value for ${input.name} (${input.type}):`,
        validate: (value: any) => {
          // Add basic validation for some common types (uint, address, etc.)
          if (input.type === 'address') {
            return /^0x[a-fA-F0-9]{40}$/.test(value) || 'Invalid address format';
          } else if (input.type.startsWith('uint')) {
            return /^\d+$/.test(value) || 'Expected a positive integer';
          }
          return true;
        },
      }))
    );

    // Convert arguments to appropriate types
    const formattedArgs = selectedMethod.inputs.map((input: any) => {
      if (input.type === 'address') {
        return getAddress(args[input.name]);
      } else if (input.type.startsWith('uint')) {
        return BigInt(args[input.name]);
      }
      return args[input.name];
    });

    console.log(`Calling method "${selectedMethod.name}" with arguments:`, formattedArgs);



    // Dynamically encode the function call
    const txData = encodeFunctionData({
      abi,
      functionName: selectedMethod.name,
      args: formattedArgs,
    });

    if (selectedMethod.stateMutability === 'view' || selectedMethod.stateMutability === 'pure') {
      // Call view/pure function
      const callResponse = await walletClient.call({
        to: contractAddress,
        data: txData,
      });

      const result = decodeFunctionResult({
        abi,
        functionName: selectedMethod.name,
        data: callResponse.data as `0x${string}`,
      });

      console.log(`Result:`, result);
    } else {

      console.log('Performing write transaction..')

      
      // For non-view methods, send a transaction
      const tx = await walletClient.sendTransaction({
        chain: connector.chain,
        to: contractAddress,
        data: txData,
        // value: BigInt(1e16),
        gasPrice: BigInt(4e8)
      });

      const receipt = await walletClient.waitForTransactionReceipt({ hash: tx });
      console.log('Transaction receipt:', receipt);
    }
  } else {
    console.log(`Calling method "${selectedMethod.name}" with no arguments.`);

    // Encode and send transaction or call method if no arguments are required
    const txData = encodeFunctionData({
      abi,
      functionName: selectedMethod.name,
      args: []
    });

    if (selectedMethod.stateMutability === 'view' || selectedMethod.stateMutability === 'pure') {
      const callResponse = await walletClient.call({
        to: contractAddress,
        data: txData
      });

      const result = decodeFunctionResult({
        abi,
        functionName: selectedMethod.name,
        data: callResponse.data as `0x${string}`,
      });

      console.log(`Result:`, result);
    } else {
      const tx = await walletClient.sendTransaction({
        chain: connector.chain,
        to: contractAddress,
        data: txData,
        gasLimit: 600000n
      });

      const receipt = await walletClient.waitForTransactionReceipt({ hash: tx });
      console.log('Transaction receipt:', receipt);
    }
  }
}
