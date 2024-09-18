
  import type { Abi, Account, Address, Chain, Client, PublicActions, PublicClient, RpcSchema, Transport, WalletActions } from 'viem';
  import { encodeFunctionData } from 'viem';

  // ReadWriteWalletClient reflects a wallet client that has been extended with PublicActions
  //  https://github.com/wevm/viem/discussions/1463#discussioncomment-7504732
  type ReadWriteWalletClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
  > = Client<
    transport,
    chain,
    account,
    RpcSchema,
    PublicActions<transport, chain, account> & WalletActions<chain, account>
  >;

  export class ContractApiClient {

    private contractAddress: Address;
    private publicClient: PublicClient;
    private walletClient?: ReadWriteWalletClient;
    private chain: Chain;

    private abi: Abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "scout",
        "type": "string"
      }
    ],
    "name": "buyToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

    constructor({
      contractAddress,
      publicClient,
      walletClient,
      chain
    }: {
      contractAddress: Address,
      chain: Chain,
      publicClient?: PublicClient,
      walletClient?: ReadWriteWalletClient,
    }) {
      if (!publicClient && !walletClient) {
        throw new Error('At least one client is required.');
      } else if (publicClient && walletClient) {
        throw new Error('Provide only a public client or wallet clients'); 
      };

      this.chain = chain;
      this.contractAddress = contractAddress;

      const client = publicClient || walletClient;

      if (client!.chain!.id !== chain.id) {
        throw new Error('Client must be on the same chain as the contract. Make sure to add a chain to your client');
      }

      if (publicClient) {
        this.publicClient = publicClient;
      } else {
        this.walletClient = walletClient;
        this.publicClient = walletClient as PublicClient; 
      }
    }

    
    async balanceOf(params: { args: { account: string, id: BigInt }, value?: bigint, gasPrice?: bigint }): Promise<any> {
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "balanceOf",
        args: [params.args.account, params.args.id],
      });

      return await this.publicClient.call({
        to: this.contractAddress,
        data: txData,
      });
    }
    

    async buyToken(params: { args: { tokenId: BigInt, amount: BigInt, scout: string }, value?: bigint, gasPrice?: bigint }): Promise<any> {
      if (!this.walletClient) {
        throw new Error('Wallet client is required for write operations.');
      }
      
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "buyToken",
        args: [params.args.tokenId, params.args.amount, params.args.scout],
      });

      const tx = await this.walletClient.sendTransaction({
        to: this.contractAddress,
        data: txData,
        value: params.value, // Optional value for payable methods
        gasPrice: params.gasPrice, // Optional gasPrice
        gasLimit: 600000n,
        account: this.walletClient.account!.address as `0x${string}`,
        chain: this.chain
      });

      return await this.walletClient.waitForTransactionReceipt({ hash: tx });
    }
    
  }
  