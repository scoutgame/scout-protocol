import fs from 'node:fs';
import path from 'node:path';

export type DeployedContractInfo = {
  name: string;
  address: string;
  network: string;
  contractArtifactSource: string;
  metadata?: any;
  deployArgs?: any[];
};

export function outputContractAddress({
  name,
  address,
  network,
  contractArtifactSource,
  metadata = {},
  deployArgs = []
}: DeployedContractInfo) {
  // Check if protocolcontracts directory exists, create if not
  const contractsDir = path.resolve('protocolcontracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  const contractWithNetworkDir = path.join(contractsDir, network);

  if (!fs.existsSync(contractWithNetworkDir)) {
    fs.mkdirSync(contractWithNetworkDir);
  }

  const contractFile = path.join(contractWithNetworkDir, `${name}.json`);
  fs.writeFileSync(
    contractFile,
    JSON.stringify({ name, address, network, contractArtifactSource, metadata, deployArgs }, null, 2)
  );
}
