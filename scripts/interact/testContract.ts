import hre from 'hardhat';
import type { Address } from 'viem/accounts';
import { privateKeyToAccount } from 'viem/accounts';

import { connectors } from '../../lib/connectors';
import { getPublicClient } from '../../lib/getWalletClient';

const RESOLVER_ADDRESS = '0x3354B452e319E03de8eC4047cB56209304DFA645';
const RECIPIENT_ADDRESS = '0x66525057AC951a0DB5C9fa7fAC6E056D6b8997E2';

async function main() {
  const contract = await hre.viem.getContractAt(
    'BuilderNFTSeasonOneImplementation01',
    connectors.optimism.seasonOneProxy as Address,
    {
      client: {
        public: getPublicClient({
          chain: connectors.optimism.chain,
          rpcUrl: connectors.optimism.rpcUrl
        })
      }
    }
    // {
    //   client: getPublicClient({
    //     chain: connectors.optimism.chain,
    //     rpcUrl: connectors.optimism.rpcUrl
    //   })
    // }
  );

  const result = await contract.read.getTokenPurchasePrice([BigInt(199), BigInt(10)], {
    blockNumber: BigInt(127925510)
  });
  console.log(result.toString());
}

const privKey = process.env.PRIVATE_KEY as Address;

console.log(privateKeyToAccount(privKey.startsWith('0x') ? privKey : `0x${privKey}`));

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
