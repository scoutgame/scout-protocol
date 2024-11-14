import fs from 'node:fs';
import path from 'node:path';

type ParsedResult = {
  contract: {
    name: string;
    write: {
      [method: string]: {
        effects: string[];
        permissions: string[];
        validations: string[];
        events: string[];
      };
    };
  };
}[];

function parseTestReport(input: any[]): ParsedResult {
  const output: ParsedResult = [];

  const contractMap: Record<
    string,
    Record<string, { effects: string[]; permissions: string[]; validations: string[]; events: string[] }>
  > = {};

  input.forEach((_row) => {
    _row.assertionResults.forEach((item: any) => {
      console.log({ item });
      const [contractName, methodName, category] = item.ancestorTitles;
      const description = item.title;

      if (!contractMap[contractName]) {
        contractMap[contractName] = {};
      }

      if (!contractMap[contractName][methodName]) {
        contractMap[contractName][methodName] = {
          effects: [],
          permissions: [],
          validations: [],
          events: []
        };
      }

      if (category in contractMap[contractName][methodName]) {
        contractMap[contractName][methodName][
          category as keyof (typeof contractMap)['contractName']['methodName']
        ].push(description);
      }
    });
  });

  for (const [contractName, methods] of Object.entries(contractMap)) {
    const write: Record<string, { effects: string[]; permissions: string[]; validations: string[]; events: string[] }> =
      {};

    for (const [methodName, categories] of Object.entries(methods)) {
      write[methodName] = categories;
    }

    output.push({
      contract: {
        name: contractName,
        write
      }
    });
  }

  const trackedSuites = [
    'BuilderNFTSeason02Implementation',
    'ScoutProtocolToken',
    'ProtocolEASResolver',
    'ScoutProtocolImplementation',
    // Utilities
    'MemoryUtils',
    'ProtocolAccessControl'
  ];
  return output.filter((item) => trackedSuites.includes(item.contract.name));
}

export function loadAndGenerateTestReport() {
  const input = fs.readFileSync(path.resolve('report.json'), 'utf8');
  const parsedOutput = parseTestReport(JSON.parse(input).testResults);
  fs.writeFileSync(path.resolve('parsedReport.json'), JSON.stringify(parsedOutput, null, 2));

  return parsedOutput;
}
