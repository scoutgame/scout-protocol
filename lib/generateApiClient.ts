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

// Generate the method implementations with object parameters
function generateMethodImplementation(abiItem: any): string {
  const functionName = abiItem.name;
  const inputs = abiItem.inputs || [];

  // Define the parameter type based on inputs
  const paramsType = inputs.length > 0
    ? `{ ${generateInputTypes(abiItem)} }`
    : '{}';

  const inputNames = inputs.map((input: any) => `params.${input.name}`).join(', ');

  // Check if the function is view/pure or payable/nonpayable
  if (abiItem.stateMutability === 'view' || abiItem.stateMutability === 'pure') {
    return `
    async ${functionName}(params: ${paramsType}): Promise<any> {
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "${functionName}",
        args: [${inputNames}],
      });

      return await this.publicClient.call({
        to: this.contractAddress,
        data: txData,
      });
    }
    `;
  } else {
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

      const tx = await this.walletClient.sendTransaction({
        to: this.contractAddress,
        data: txData,
        gasLimit: 600000n
      });

      return await this.walletClient.waitForTransactionReceipt({ hash: tx });
    }
    `;
  }
}

// Main function to generate the API client
async function generateApiClient({ abi, selectedFunctionIndices }: { abi: any[], selectedFunctionIndices: number[] }) {
  const selectedFunctions = selectedFunctionIndices.map(index => abi[index]);

  // Generate TypeScript class code
  let classCode = `
  import type { Abi } from 'viem';
  import { encodeFunctionData } from 'viem';

  export class ContractApiClient {

    private contractAddress: string;
    private publicClient: any;
    private walletClient?: any;

    private abi: Abi;

    constructor({
      contractAddress,
      publicClient,
      walletClient,
    }: {
      contractAddress: string,
      publicClient: any,
      walletClient?: any,
    }) {
      this.contractAddress = contractAddress;
      this.abi = abi;
      this.publicClient = publicClient;
      this.walletClient = walletClient;
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
    const resolvedPath = path.resolve(abiFilePath);
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

  const selectedFunctionIndices = functionIndices.split(',').map((num: string) => parseInt(num.trim(), 10) - 1);

  // Generate the API client with the selected functions
  await generateApiClient({ abi, selectedFunctionIndices });
}

// Run the script
main();