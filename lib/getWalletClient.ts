import { Chain, createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";


export function getWalletClient({privateKey, chain, rpcUrl}: {privateKey: string; chain: Chain, rpcUrl: string}) {
  return createWalletClient({
    account: privateKeyToAccount((privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`),
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);
}