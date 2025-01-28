import type {
  Abi,
  Account,
  Address,
  Chain,
  Client,
  PublicActions,
  PublicClient,
  RpcSchema,
  TransactionReceipt,
  Transport,
  WalletActions,
  WalletClient
} from 'viem';
import { encodeFunctionData, decodeFunctionResult, getAddress } from 'viem';

// ReadWriteWalletClient reflects a wallet client that has been extended with PublicActions
//  https://github.com/wevm/viem/discussions/1463#discussioncomment-7504732
type ReadWriteWalletClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined
> = Client<
  transport,
  chain,
  account,
  RpcSchema,
  PublicActions<transport, chain, account> & WalletActions<chain, account>
>;

export class ISuperchainBridgeClient {
  private contractAddress: Address;

  private publicClient: PublicClient;

  private walletClient?: ReadWriteWalletClient;

  private chain: Chain;

  public abi: Abi = [
    {
      inputs: [
        {
          internalType: 'contract IERC7802',
          name: '_token',
          type: 'address'
        },
        {
          internalType: 'address',
          name: '_from',
          type: 'address'
        },
        {
          internalType: 'address',
          name: '_to',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: '_amount',
          type: 'uint256'
        }
      ],
      name: 'relayERC20',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        {
          internalType: 'contract IERC7802',
          name: '_token',
          type: 'address'
        },
        {
          internalType: 'address',
          name: '_to',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: '_amount',
          type: 'uint256'
        },
        {
          internalType: 'uint256',
          name: '_chainId',
          type: 'uint256'
        }
      ],
      name: 'sendERC20',
      outputs: [
        {
          internalType: 'bytes32',
          name: 'msgHash_',
          type: 'bytes32'
        }
      ],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ];

  constructor({
    contractAddress,
    publicClient,
    walletClient,
    chain
  }: {
    contractAddress: Address;
    chain: Chain;
    publicClient?: PublicClient;
    walletClient?: ReadWriteWalletClient;
  }) {
    if (!publicClient && !walletClient) {
      throw new Error('At least one client is required.');
    } else if (publicClient && walletClient) {
      throw new Error('Provide only a public client or wallet clients');
    }

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

  async relayERC20(params: {
    args: { _token: Address; _from: Address; _to: Address; _amount: bigint };
    value?: bigint;
    gasPrice?: bigint;
  }): Promise<TransactionReceipt> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for write operations.');
    }

    const txData = encodeFunctionData({
      abi: this.abi,
      functionName: 'relayERC20',
      args: [params.args._token, params.args._from, params.args._to, params.args._amount]
    });

    const txInput: Omit<Parameters<WalletClient['sendTransaction']>[0], 'account' | 'chain'> = {
      to: getAddress(this.contractAddress),
      data: txData,
      value: params.value ?? BigInt(0), // Optional value for payable methods
      gasPrice: params.gasPrice // Optional gasPrice
    };

    // This is necessary because the wallet client requires account and chain, which actually cause writes to throw
    const tx = await this.walletClient.sendTransaction(txInput as any);

    // Return the transaction receipt
    return this.walletClient.waitForTransactionReceipt({ hash: tx });
  }

  async sendERC20(params: {
    args: { _token: Address; _to: Address; _amount: bigint; _chainId: bigint };
    value?: bigint;
    gasPrice?: bigint;
  }): Promise<TransactionReceipt> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for write operations.');
    }

    const txData = encodeFunctionData({
      abi: this.abi,
      functionName: 'sendERC20',
      args: [params.args._token, params.args._to, params.args._amount, params.args._chainId]
    });

    const txInput: Omit<Parameters<WalletClient['sendTransaction']>[0], 'account' | 'chain'> = {
      to: getAddress(this.contractAddress),
      data: txData,
      value: params.value ?? BigInt(0), // Optional value for payable methods
      gasPrice: params.gasPrice // Optional gasPrice
    };

    // This is necessary because the wallet client requires account and chain, which actually cause writes to throw
    const tx = await this.walletClient.sendTransaction(txInput as any);

    // Return the transaction receipt
    return this.walletClient.waitForTransactionReceipt({ hash: tx });
  }
}
