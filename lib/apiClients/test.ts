
import type { Abi, Address, PublicClient, WalletClient } from 'viem';
import { encodeFunctionData } from 'viem';
import { getWalletClient } from '../getWalletClient';
import { base } from 'viem/chains';
import {connectors} from '../connectors';


import {ContractApiClient} from './ContractApiClient'



const walletClient = getWalletClient({chain: base, privateKey: process.env.PRIVATE_KEY as string, rpcUrl: connectors.base.rpcUrl});

const contractClient = new ContractApiClient({
  contractAddress: connectors.base.builderNFTContract,
  walletClient,
  chain: base,
})

console.log("Interacting BuilderNFT via the account:", walletClient.account.address, "on chain:", base.name); 


contractClient.balanceOf({args: {account: walletClient.account.address, id: BigInt(0)} }).then();