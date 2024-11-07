import {
  decodeGithubContributionReceiptAttestation,
  encodeGithubContributionReceiptAttestation,
  githubContributionReceiptEASSchema,
  NULL_EAS_REF_UID,
  NULL_EVM_ADDRESS
} from '@charmverse/core/protocol';
import type { GithubContributionReceiptAttestation } from '@charmverse/core/protocol';
import { viem } from 'hardhat';
import { parseEventLogs } from 'viem';

import type { GeneratedWallet } from './generateWallets';
import { generateWallets } from './generateWallets';

export async function deployEASContracts() {
  const { adminAccount: admin, userAccount: attesterWallet } = await generateWallets();

  const EASSchemaRegistryContract = await viem.deployContract('SchemaRegistry', []);

  const EASAttestationContract = await viem.deployContract('EAS', [EASSchemaRegistryContract.address], {
    client: { wallet: admin }
  });

  const ProtocolEASResolverContract = await viem.deployContract(
    'ProtocolEASResolver',
    [EASAttestationContract.address, attesterWallet.account.address],
    {
      client: { wallet: admin }
    }
  );

  const githubContributionReceiptSchemaTx = await EASSchemaRegistryContract.write.register(
    [githubContributionReceiptEASSchema, ProtocolEASResolverContract.address, true],
    {
      account: attesterWallet.account
    }
  );

  const receipt = await attesterWallet.getTransactionReceipt({ hash: githubContributionReceiptSchemaTx });

  const parsedLogs = parseEventLogs({
    abi: EASSchemaRegistryContract.abi,
    logs: receipt.logs,
    eventName: ['Registered']
  });

  const githubContributionReceiptSchemaId = parsedLogs[0].args.uid;

  async function attestContributionReceipt({
    data,
    wallet
  }: {
    data: GithubContributionReceiptAttestation;
    wallet?: GeneratedWallet;
  }): Promise<`0x${string}`> {
    const attestArgs: Parameters<typeof EASAttestationContract.write.attest>[0] = [
      {
        schema: githubContributionReceiptSchemaId,
        data: {
          value: BigInt(0),
          revocable: true,
          recipient: NULL_EVM_ADDRESS,
          refUID: NULL_EAS_REF_UID,
          expirationTime: BigInt(0),
          data: encodeGithubContributionReceiptAttestation(data)
        }
      }
    ];

    const attestationTx = await EASAttestationContract.write.attest(attestArgs, {
      account: wallet?.account ?? attesterWallet.account
    });

    const _receipt = await attesterWallet.getTransactionReceipt({ hash: attestationTx });

    const _parsedLogs = parseEventLogs({
      abi: EASAttestationContract.abi,
      logs: _receipt.logs,
      eventName: ['Attested']
    });

    const attestationUid = _parsedLogs[0].args.uid;

    return attestationUid;
  }

  async function getContributionReceipt(attestationUid: string): Promise<GithubContributionReceiptAttestation> {
    const onchainAttestationData = await EASAttestationContract.read.getAttestation([attestationUid as `0x${string}`]);

    const decodedData = decodeGithubContributionReceiptAttestation(onchainAttestationData.data);

    return decodedData;
  }

  return {
    EASSchemaRegistryContract,
    EASAttestationContract,
    ProtocolEASResolverContract,
    easResolverAdminWallet: admin,
    attesterWallet,
    githubContributionReceiptSchemaId,
    attestContributionReceipt,
    getContributionReceipt
  };
}

export type EASTestFixture = Awaited<ReturnType<typeof deployEASContracts>>;
