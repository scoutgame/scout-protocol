import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

// Helper to convert Solidity types to TypeScript types
function solidityTypeToTsType(solType: string): string {
  if (solType === 'address') return 'string';
  if (solType.startsWith('uint') || solType.startsWith('int')) return 'BigInt';
  if (solType === 'bool') return 'boolean';
  if (solType === 'string') return 'string';
  return 'any'; // Fallback for unsupported types
}

// Generate TypeScript function parameter type from ABI inputs
function generateInputTypes(abiItem: any): string {
  const inputs = abiItem.inputs || [];
  return inputs
    .map((input: any) => `${input.name}: ${solidityTypeToTsType(input.type)}`)
    .join(', ');
}

function generateMethodImplementation(abiItem: any): string {
  const functionName = abiItem.name;
  const inputs = abiItem.inputs || [];
  const outputs = abiItem.outputs || [];
  

  const inputNames = inputs.map((input: any) => `params.args.${input.name}`).join(', ');

  // Function to handle the output parsing based on ABI output types
  function getReturnType(outputs: any[]): string {
    if (!outputs.length) return 'null';
    if (outputs.length === 1) return solidityTypeToTsType(outputs[0].type);
    return `{ ${outputs.map((output: any, i: number) => `${output.name || 'output' + i}: ${solidityTypeToTsType(output.type)}`).join(', ')} }`;
  }

  const isReadOperation = abiItem.stateMutability === 'view' || abiItem.stateMutability === 'pure';

  const transactionConfig = isReadOperation ? '' : 'value?: bigint, gasPrice?: bigint';

  // Define the parameter type based on inputs
  const paramsType = inputs.length > 0
  ? `{ args: { ${generateInputTypes(abiItem)} }, ${transactionConfig} }`
  : transactionConfig ? `{ ${transactionConfig} }` : '';

  // Handle read methods (view/pure) with output type parsing
  if (isReadOperation) {
    const returnType = getReturnType(outputs);

    return `
    async ${functionName}(${paramsType ? `params: ${paramsType}` : ''}): Promise<${returnType}> {
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "${functionName}",
        args: [${inputNames}],
      });

      const { data } = await this.publicClient.call({
        to: this.contractAddress,
        data: txData,
      });

      // Decode the result based on the expected return type
      const result = decodeFunctionResult({
        abi: this.abi,
        functionName: "${functionName}",
        data: data as \`0x\${string}\`,
      });

      // Parse the result based on the return type
      return result as ${returnType};
    }
    `;
  } else {
    // Handle write methods (payable/nonpayable) and return the transaction receipt
    return `
    async ${functionName}(params: ${paramsType}): Promise<any> {
      if (!this.walletClient) {
        throw new Error('Wallet client is required for write operations.');
      }
      
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "${functionName}",
        args: [${inputNames}],
      });

      const txInput: Omit<Parameters<WalletClient['sendTransaction']>[0], 'account' | 'chain'> = {
        to: getAddress(this.contractAddress),
        data: txData,
        value: params.value ?? BigInt(0), // Optional value for payable methods
        gasPrice: params.gasPrice, // Optional gasPrice
      };

      // This is necessary because the wallet client requires account and chain, which actually cause writes to throw
      const tx = await this.walletClient.sendTransaction(txInput as any);

      // Return the transaction receipt
      return this.walletClient.waitForTransactionReceipt({ hash: tx });
    }
    `;
  }
}

// Main function to generate the API client
async function generateApiClient({ abi, selectedFunctionIndices }: { abi: any[], selectedFunctionIndices: number[] }) {
  const selectedFunctions = selectedFunctionIndices.map(index => abi[index]);

  // Generate TypeScript class code
  let classCode = `
  import type { Abi, Account, Address, Chain, Client, PublicActions, PublicClient, RpcSchema, Transport, WalletActions, WalletClient } from 'viem';
  import { encodeFunctionData, decodeFunctionResult, getAddress } from 'viem';

  // ReadWriteWalletClient reflects a wallet client that has been extended with PublicActions
  //  https://github.com/wevm/viem/discussions/1463#discussioncomment-7504732
  type ReadWriteWalletClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
  > = Client<
    transport,
    chain,
    account,
    RpcSchema,
    PublicActions<transport, chain, account> & WalletActions<chain, account>
  >;

  export class ContractApiClient {

    private contractAddress: Address;
    private publicClient: PublicClient;
    private walletClient?: ReadWriteWalletClient;
    private chain: Chain;

    private abi: Abi = ${JSON.stringify(selectedFunctions, null, 2)};

    constructor({
      contractAddress,
      publicClient,
      walletClient,
      chain
    }: {
      contractAddress: Address,
      chain: Chain,
      publicClient?: PublicClient,
      walletClient?: ReadWriteWalletClient,
    }) {
      if (!publicClient && !walletClient) {
        throw new Error('At least one client is required.');
      } else if (publicClient && walletClient) {
        throw new Error('Provide only a public client or wallet clients'); 
      };

      this.chain = chain;
      this.contractAddress = contractAddress;

      const client = publicClient || walletClient;

      if (client!.chain!.id !== chain.id) {
        throw new Error('Client must be on the same chain as the contract. Make sure to add a chain to your client');
      }

      if (publicClient) {
        this.publicClient = publicClient;
      } else {
        this.walletClient = walletClient;
        this.publicClient = walletClient as PublicClient; 
      }
    }

    ${selectedFunctions.map(generateMethodImplementation).join('\n')}
  }
  `;

  // Write to a separate file
  const outputPath = path.join(__dirname, '/apiClients/ContractApiClient.ts');
  fs.writeFileSync(outputPath, classCode);
  console.log(`API Client written to ${outputPath}`);
}

// Function to load the ABI from a file
function loadAbiFromFile(abiFilePath: string): any[] {
  try {
    const resolvedPath = path.resolve( abiFilePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`ABI file not found at path: ${resolvedPath}`);
    }

    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    const abi = JSON.parse(fileContent);

    if (!Array.isArray(abi)) {
      throw new Error('Invalid ABI format. Expected an array.');
    }

    return abi;
  } catch (error) {
    throw new Error(`Failed to load ABI: ${error}`);
  }
}

// Main execution flow
async function main() {
  // Ask the user for the ABI file path
  const { abiFilePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'abiFilePath',
      message: 'Enter the path to the ABI file:',
      validate: (input: string) => input.length > 0 ? true : 'ABI file path cannot be empty',
    },
  ]);

  // Load ABI from the file
  let abi: any[] = [];
  try {
    abi = loadAbiFromFile(abiFilePath);
  } catch (error) {
    console.error(error);
    return;
  }

  // Display available contract methods
  console.log("Available contract methods:");
  abi.forEach((method, index) => {
    console.log(`${index + 1}. ${method.name} (${method.stateMutability})`);
  });

  // Ask the user which functions to include
  const { functionIndices } = await inquirer.prompt([
    {
      type: 'input',
      name: 'functionIndices',
      message: 'Enter the numbers of the functions you want in the API client, separated by commas:',
      validate: (input) => {
        const indices = input.split(',').map(Number);
        return indices.every(index => index > 0 && index <= abi.length) ? true : 'Invalid function number(s)';
      },
    },
  ]);

  // Map selected functions and display them for confirmation
  const selectedFunctionIndices = functionIndices.split(',').map((num: string) => parseInt(num.trim(), 10) - 1) as number[];
  const selectedFunctions = selectedFunctionIndices.map(index => ({
    index: index + 1, // +1 to display correct user-facing index
    name: abi[index].name,
    stateMutability: abi[index].stateMutability
  }));

  // Display selected methods to the user
  console.log("\nYou have selected the following methods:");
  selectedFunctions.forEach((method) => {
    console.log(`${method.index}. ${method.name} (${method.stateMutability})`);
  });

  // Ask for confirmation
  const { confirmSelection } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSelection',
      message: 'Do you want to proceed with these methods?',
    },
  ]);

  if (!confirmSelection) {
    console.log("\nRestarting selection process...\n");
    return main(); // Restart the process if the user says no
  }

  // Generate the API client with the selected functions
  await generateApiClient({ abi, selectedFunctionIndices });
}

// Run the script
main();
