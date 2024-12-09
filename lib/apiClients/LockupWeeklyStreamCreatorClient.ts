
  import type { Abi, Account, Address, Chain, Client, PublicActions, PublicClient, RpcSchema, TransactionReceipt, Transport, WalletActions, WalletClient } from 'viem';
  import { encodeFunctionData, decodeFunctionResult, getAddress } from 'viem';

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

  export class LockupWeeklyStreamCreatorClient {

    private contractAddress: Address;
    private publicClient: PublicClient;
    private walletClient?: ReadWriteWalletClient;
    private chain: Chain;

    public abi: Abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "totalAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "_startDate",
        "type": "uint128"
      }
    ],
    "name": "createStream",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
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

    
    async claim(params: { args: { streamId: BigInt }, value?: bigint, gasPrice?: bigint }): Promise<TransactionReceipt> {
      if (!this.walletClient) {
        throw new Error('Wallet client is required for write operations.');
      }
      
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "claim",
        args: [params.args.streamId],
      });

      const txInput: Omit<Parameters<WalletClient['sendTransaction']>[0], 'account' | 'chain'> = {
        to: getAddress(this.contractAddress),
        data: txData,
        value: params.value ?? BigInt(0), // Optional value for payable methods
        gasPrice: params.gasPrice, // Optional gasPrice
      };

      // This is necessary because the wallet client requires account and chain, which actually cause writes to throw
      const tx = await this.walletClient.sendTransaction(txInput as any);

      // Return the transaction receipt
      return this.walletClient.waitForTransactionReceipt({ hash: tx });
    }
    

    async createStream(params: { args: { recipient: string, totalAmount: BigInt, _startDate: BigInt }, value?: bigint, gasPrice?: bigint }): Promise<TransactionReceipt> {
      if (!this.walletClient) {
        throw new Error('Wallet client is required for write operations.');
      }
      
      const txData = encodeFunctionData({
        abi: this.abi,
        functionName: "createStream",
        args: [params.args.recipient, params.args.totalAmount, params.args._startDate],
      });

      const txInput: Omit<Parameters<WalletClient['sendTransaction']>[0], 'account' | 'chain'> = {
        to: getAddress(this.contractAddress),
        data: txData,
        value: params.value ?? BigInt(0), // Optional value for payable methods
        gasPrice: params.gasPrice, // Optional gasPrice
      };

      // This is necessary because the wallet client requires account and chain, which actually cause writes to throw
      const tx = await this.walletClient.sendTransaction(txInput as any);

      // Return the transaction receipt
      return this.walletClient.waitForTransactionReceipt({ hash: tx });
    }
    
  }
  