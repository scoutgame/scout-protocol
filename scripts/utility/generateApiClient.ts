import inquirer from 'inquirer';

import { generateApiClient, loadAbiFromFile } from '../../lib/generateApiClient';

// Main execution flow
async function main() {
  // Ask the user for the ABI file path
  const { abiFilePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'abiFilePath',
      message: 'Enter the path to the ABI file:',
      validate: (input: string) => (input.length > 0 ? true : 'ABI file path cannot be empty')
    }
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
  console.log('Available contract methods:');
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
        return indices.every((index) => index > 0 && index <= abi.length) ? true : 'Invalid function number(s)';
      }
    }
  ]);

  // Map selected functions and display them for confirmation
  const selectedFunctionIndices = functionIndices
    .split(',')
    .map((num: string) => parseInt(num.trim(), 10) - 1) as number[];
  const selectedFunctions = selectedFunctionIndices.map((index) => ({
    index: index + 1, // +1 to display correct user-facing index
    name: abi[index].name,
    stateMutability: abi[index].stateMutability
  }));

  // Display selected methods to the user
  console.log('\nYou have selected the following methods:');
  selectedFunctions.forEach((method) => {
    console.log(`${method.index}. ${method.name} (${method.stateMutability})`);
  });

  // Ask for confirmation
  const { confirmSelection } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSelection',
      message: 'Do you want to proceed with these methods?'
    }
  ]);

  if (!confirmSelection) {
    console.log('\nRestarting selection process...\n');
    return main(); // Restart the process if the user says no
  }

  // Generate the API client with the selected functions
  await generateApiClient({ abi, selectedFunctionIndices, abiPath: abiFilePath });
}

// Run the script
main();
