import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer'; // Importing inquirer for interactive CLI
import { Address, createWalletClient, decodeFunctionResult, encodeFunctionData, getAddress, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getConnectorFromHardhatRuntimeEnvironment } from './connectors';

type InteractParams = {
  hre: HardhatRuntimeEnvironment;
  contractAddress: Address;
  privateKey: `0x${string}`;
  abi: any;
}

export async function interactWithContract(params: InteractParams): Promise<void> {
  const {
    hre,
    contractAddress,
    privateKey,
    abi
  } = params;
  const connector = getConnectorFromHardhatRuntimeEnvironment(hre);

  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: connector.chain,
    transport: http(connector.rpcUrl),
  }).extend(publicActions);

  const signer = walletClient.account;
  console.log('Wallet address:', signer.address);

  console.log('Contract address:', connector.builderNFTContract);
  console.log('USDC address:', connector.usdcContract);

  // List available contract methods
  const contractMethods = abi.filter((item: any) => item.type === 'function');

  // Show contract methods in CLI
  console.log('Available contract methods:');
  contractMethods.forEach((method: any, index: number) => {
    console.log(`${index + 1}. ${method.name}`);
  });

  console.log(`\r\n🏦 From Wallet: ${signer.address}\r\n`);
  console.log(`\r\n📑 To Contract: ${contractAddress}\r\n`);
  

  // Select method using inquirer
  const { selectedMethodIndex } = await inquirer.prompt([
    {
      type: 'input',
      name: 'selectedMethodIndex',
      message: 'nter the number of the method you want to call:',
      validate: (input) => {
        const index = parseInt(input, 10);
        return index > 0 && index <= contractMethods.length ? true : 'Invalid method number';
      },
    },
  ]);

  const methodIndex = parseInt(selectedMethodIndex, 10) - 1;
  const selectedMethod = contractMethods[methodIndex];
  let txData;



  // If method has inputs, prompt for arguments
  if (selectedMethod.inputs.length > 0) {
    console.log(`You selected the method: ${selectedMethod.name}`);
    const args = await inquirer.prompt(
      selectedMethod.inputs.map((input: any) => ({
        type: 'input',
        name: input.name,
        message: `Enter value for ${input.name} (${input.type}):`,
        validate: (value: any) => {
          if (input.type === 'address') return /^0x[a-fA-F0-9]{40}$/.test(value) || 'Invalid address format';
          if (input.type.startsWith('uint')) return /^\d+$/.test(value) || 'Expected a positive integer';
          return true;
        },
      }))
    );

    const formattedArgs = selectedMethod.inputs.map((input: any) => {
      if (input.type === 'address') return getAddress(args[input.name]);
      if (input.type.startsWith('uint')) return BigInt(args[input.name]);
      return args[input.name];
    });

    console.log(`Calling method "${selectedMethod.name}" with arguments:`, formattedArgs);

    // Encode function call with arguments
    txData = encodeFunctionData({
      abi,
      functionName: selectedMethod.name,
      args: formattedArgs,
    });
  }

  // If no args, encode function without arguments
  if (!txData) {
    console.log(`Calling method "${selectedMethod.name}" with no arguments.`);
    txData = encodeFunctionData({
      abi,
      functionName: selectedMethod.name,
      args: [],
    });
  }

  // Handle payable methods
  let value: bigint | undefined = undefined;
  if (selectedMethod.stateMutability === 'payable') {
    const { ethValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'ethValue',
        message: 'Enter the ETH value to send (in ETH):',
        validate: (input) => !isNaN(parseFloat(input)) && parseFloat(input) >= 0 ? true : 'Invalid ETH value',
      },
    ]);
    value = BigInt(parseFloat(ethValue) * 1e18); // Convert ETH to wei
  }

  // Call or send transaction depending on the method's state mutability
  if (['view', 'pure'].includes(selectedMethod.stateMutability)) {

    console.log('Performing read operation...');

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
    console.log('Performing write transaction...');

    const tx = await walletClient.sendTransaction({
      chain: connector.chain,
      to: contractAddress,
      data: txData,
      value, // Only set value if applicable (undefined for non-payable functions)
      // gasPrice: BigInt(4e7), // 40 gwei
    });

    const receipt = await walletClient.waitForTransactionReceipt({ hash: tx });
    console.log('Transaction receipt:', receipt);
  }

  const {decision} = await inquirer.prompt([
    {
      type: 'input',
      name: 'decision',
      message: 'Continue ? Y/N',
    },
  ]);

  if (!String(decision).toLowerCase().startsWith('y')) {
    return
  }


  return interactWithContract(params);
}