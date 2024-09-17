import fs from 'fs';
import path from 'path';

export function ensureDirectoryExists(directory: string) {
  const directoryPath = path.resolve(directory);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
    console.log('abis directory created.');
  } else {
    console.log('abis directory already exists.');
  }
}


export function ensureAbisDirectoryExists() {
  return ensureDirectoryExists('abis');
}