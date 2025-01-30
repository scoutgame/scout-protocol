import { task } from 'hardhat/config';
import type { Address } from 'viem';

import { getScoutProtocolSafeAddress } from '../../lib/constants';

const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

task('prepareScoutGameLaunchSafeTransaction', 'Deploys or updates the Scout Game ERC20 contract').setAction(
  async (taskArgs, hre) => {
    await hre.run('compile');

    // ---------------------------------------------------------------------
    // Enter the address of all the contracts here

    // Safe Address which admins all contracts
    const safeAddress = getScoutProtocolSafeAddress();

    // ERC20
    const scoutTokenERC20ProxyAddress = '' as Address;
    const erc20Decimals = BigInt(10) ** BigInt(18);

    // ERC1155
    const scoutBuilderNFTERC1155ProxyAddress = '' as Address;
    const scoutProtocolBuilderNftMinterAddress = '' as Address;

    const nftPrefix = 'https://awsresourcehere.com/';
    const nftSuffix = 'metadata.json';

    // EAS Resolver Config
    const easResolverAddress = '' as Address;
    const easAttesterWalletAddress = '' as Address;

    // Protocol Config
    // Make sure this is the actual allocation
    const _season01ProtocolTokenAllocationAsWholeNumber = 100;

    const season01ProtocolTokenAllocation = BigInt(_season01ProtocolTokenAllocationAsWholeNumber) * erc20Decimals;

    const scoutProtocolAddress = '' as Address;

    // Sablier Lockup Tranched
    const sablierLockupTranchedAddress = '' as Address;
    const firstTokenDistributionTimestamp = 1_743_984_000;

    // TODO - Convert these contract calls to propose a Safe Transaction

    // ---------------------------------------------------------------------
    // Phase 1 - Initialise the ERC20 to distribute the tokens
    // Initialize the proxy

    const scoutTokenERC20Proxy = await hre.viem.getContractAt(
      'ScoutTokenERC20Implementation',
      scoutTokenERC20ProxyAddress,
      {}
    );

    await scoutTokenERC20Proxy.write.initialize();

    // ---------------------------------------------------------------------
    // Phase 2 - Prepare the Builder NFT contract

    const builderNft = await hre.viem.getContractAt(
      'ScoutProtocolBuilderNFTImplementation',
      scoutBuilderNFTERC1155ProxyAddress,
      {}
    );

    await builderNft.write.setMinter([scoutProtocolBuilderNftMinterAddress]);
    await builderNft.write.setBaseUri([nftPrefix, nftSuffix]);

    // Phase 3 - Configure the EAS Attester Wallet
    const easResolver = await hre.viem.getContractAt('ProtocolEASResolver', easResolverAddress, {});

    await easResolver.write.setAttesterWallet([easAttesterWalletAddress]);

    // Phase 4 - Create the stream
    const lockup = await hre.viem.getContractAt('LockupWeeklyStreamCreator', scoutProtocolAddress, {});
    await lockup.write.createStream([
      sablierLockupTranchedAddress,
      season01ProtocolTokenAllocation,
      BigInt(firstTokenDistributionTimestamp)
    ]);
  }
);

module.exports = {};
