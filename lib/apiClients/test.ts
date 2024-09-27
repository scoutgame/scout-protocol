
import type { Abi, Address, PublicClient, WalletClient } from 'viem';
import { encodeFunctionData } from 'viem';
import { getWalletClient } from '../getWalletClient';
import { base, optimismSepolia } from 'viem/chains';
import {connectors} from '../connectors';


import {ContractApiClient} from './ContractApiClient'
import { BuilderNFTSeasonOneClient } from './BuilderNFTSeasonOneClient';
import {UsdcErc20ABIClient} from './UsdcErc20ABIClient';

const usdcDecimals = 1000000

const selectedConnector: keyof typeof connectors = 'opsepolia';

const chain = connectors[selectedConnector].chain;

const walletClient = getWalletClient({chain: chain , privateKey: process.env.PRIVATE_KEY as string, rpcUrl: chain.rpcUrls.default.http[0] as string});


const contractClient = new BuilderNFTSeasonOneClient({
  contractAddress: connectors.opsepolia.builderNFTContract,
  walletClient,
  chain,
});

const usdcClient = new UsdcErc20ABIClient({
  contractAddress: connectors.opsepolia.builderNFTContract as `0x${string}`,
  chain: connectors.opsepolia.chain,
  walletClient
})

console.log("Interacting BuilderNFT via the account:", walletClient.account.address, "on chain:", chain.name); 

async function testAdminMode() {
  console.log("registerBuilderToken");
  await contractClient.registerBuilderToken({args: {builderId: 'fc70e8f8-e35e-4a98-9a84-b34f99b32196'}, gasPrice: BigInt(4e7)}).then(console.log);
}

async function test() {

  // console.log('Current USDC Allowance');
  // const allowance = await usdcClient.allowance({args: {owner: walletClient.account.address, spender: connectors[selectedConnector].builderNFTContract}});

  // console.log(`Allowance in Decimals: ${allowance}\r\n`,)
  // console.log(`Allowance in $${(Number(allowance) / usdcDecimals).toFixed(2)}`,)

  const tokenId = BigInt(1);

  console.log('Buying token ID: ', tokenId);

  // Test read functions
  const totalSupply = await contractClient.totalSupply({args: {tokenId}});
  console.log("Already Minted", totalSupply);

  const price = await contractClient.getTokenQuote({
    args: {
      tokenId,
      amount: BigInt(1)
    }
  })

  console.log("Current Price: ", price)

  // Test write functions
  console.log("buyToken");
  await contractClient.mintBuilderNft({args: {tokenId: BigInt(1), amount: BigInt(1), scout: "0c3c75bc-dae0-487d-947e-0b780a38988d"} }).then(console.log);
}



usdcClient.allowance({args: {owner: '0x2523Cd8d1f401D07b257BF488C56aeB4Ef72d8f0', spender: '0xc6534d33bc65e319fb082e82c0b56bd4d9854aaf'}}).then(console.log)

// test().then(() => console.log('Testing complete'));



