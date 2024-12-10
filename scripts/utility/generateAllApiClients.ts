import fs from 'node:fs';
import path from 'node:path';

import { log } from '@charmverse/core/log';

import { generateApiClient, loadAbiFromFile } from '../../lib/generateApiClient';

function getAllJsonFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        console.log(fullPath);

        // Only include contract artifacts, skip dbg files
        if (!entry.name.includes('.dbg.') && !fullPath.includes('libs') && !fullPath.includes('test')) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return [...new Set(files)]; // Remove any duplicates
}

async function generateAllApiClients() {
  // Get all JSON files from artifacts/contracts/protocol
  const artifactsPath = path.resolve('artifacts/contracts/protocol');
  const seasonOnePath = path.resolve('artifacts/contracts/SeasonOne');
  const jsonFiles: string[] = [];

  const rootPaths = [artifactsPath, seasonOnePath];

  for (const rootPath of rootPaths) {
    const files = getAllJsonFiles(rootPath);
    jsonFiles.push(...files);
  }

  // Also include any ABIs from the abis directory
  console.log('Generating API clients for the following ABIs:', jsonFiles);

  for (let i = 0; i < jsonFiles.length; i++) {
    const jsonFile = jsonFiles[i];

    log.info(`Generating API client for ${jsonFile} (${i + 1} of ${jsonFiles.length})`);

    const abi = loadAbiFromFile(jsonFile);
    if (abi) {
      const relativePath = path.relative(process.cwd(), jsonFile);
      await generateApiClient({
        abi,
        abiPath: relativePath
      });
    }
  }
}

generateAllApiClients().catch(console.error);
