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

export class BuilderNFTSeasonOneImplementation01Client {
  private contractAddress: Address;

  private publicClient: PublicClient;

  private walletClient?: ReadWriteWalletClient;

  private chain: Chain;

  public abi: Abi = [
    {
      inputs: [],
      name: 'getMinter',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address'
        }
      ],
      stateMutability: 'view',
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

  async getMinter(): Promise<string> {
    const txData = encodeFunctionData({
      abi: this.abi,
      functionName: 'getMinter',
      args: []
    });

    const { data } = await this.publicClient.call({
      to: this.contractAddress,
      data: txData
    });

    // Decode the result based on the expected return type
    const result = decodeFunctionResult({
      abi: this.abi,
      functionName: 'getMinter',
      data: data as `0x${string}`
    });

    // Parse the result based on the return type
    return result as string;
  }
}
