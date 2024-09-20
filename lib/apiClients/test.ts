
import type { Abi, Address, PublicClient, WalletClient } from 'viem';
import { encodeFunctionData } from 'viem';
import { getWalletClient } from '../getWalletClient';
import { base } from 'viem/chains';
import {connectors} from '../connectors';


import {ContractApiClient} from './ContractApiClient'



const walletClient = getWalletClient({chain: base, privateKey: process.env.PRIVATE_KEY as string, rpcUrl: connectors.base.rpcUrl});

const contractClient = new ContractApiClient({
  contractAddress: connectors.basesepolia.builderNFTContract,
  walletClient,
  chain: base,
});

console.log("Interacting BuilderNFT via the account:", walletClient.account.address, "on chain:", base.name); 

async function test() {

  const tokenId = BigInt(0);

  // Test read functions
  // console.log("balanceOf");
  // await contractClient.balanceOf({args: {account: walletClient.account.address, id: tokenId} }).then(console.log);

  // console.log("getTokenPurchasePrice");
  // await contractClient.getTokenPurchasePrice({args: {tokenId, amount: BigInt(1)} }).then(console.log);

  // console.log("getTotalSupply");
  // await contractClient.totalSupply({args: {tokenId}}).then(console.log);


  // Test write functions
  // console.log("buyToken");
  // await contractClient.buyToken({args: {tokenId: BigInt(0), amount: BigInt(1), scout: "scout"} }).then(console.log);

  console.log("registerBuilderToken");
  await contractClient.registerBuilderToken({args: {builderId: 'fc70e8f8-e35e-4a98-9a84-b34f99b32196'}, gasPrice: BigInt(4e7)}).then(console.log);
}


test().then(() => console.log('Testing complete'));



