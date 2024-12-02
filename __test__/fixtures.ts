import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';

import { deployBuilderNftContract } from './deployBuilderNft';
import { deployBuilderNftSeason02Contract } from './deployBuilderNftSeason02';
import { deployBuilderNftStarterPackContract } from './deployBuilderNftStarterPack';
import { deployEASContracts } from './deployEAS';
import { deployProtocolContract } from './deployProtocol';
import { deployScoutTokenERC20 } from './deployScoutTokenERC20';
import { deployTestUSDC } from './deployTestUSDC';

export async function deployContractFixtures() {
  const usdc = await deployTestUSDC();
  const builderNft = await deployBuilderNftContract({ USDCContractAddress: usdc.USDC.address });
  // Return contracts and signers for tests
  return { usdc, builderNft };
}

export async function loadContractFixtures() {
  return loadFixture(deployContractFixtures);
}

export async function loadContractWithStarterPackFixtures() {
  const { usdc } = await loadContractFixtures();
  const builderNftStarterPack = await deployBuilderNftStarterPackContract({
    USDCContractAddress: usdc.USDC.address
  });
  return { usdc, builderNftStarterPack };
}

async function deployProtocolFixtures() {
  const token = await deployScoutTokenERC20();
  const protocol = await deployProtocolContract({ ProtocolERC20Address: token.ProtocolERC20.address });
  const eas = await deployEASContracts();

  return { token, protocol, eas };
}

async function deployBuilderNFTSeason02Fixtures() {
  const token = await deployScoutTokenERC20();
  const builderNftSeason02 = await deployBuilderNftSeason02Contract({ ScoutERC20Address: token.ProtocolERC20.address });

  return { token, builderNftSeason02 };
}

export async function loadScoutTokenERC20Fixtures() {
  return loadFixture(deployScoutTokenERC20);
}

export async function loadBuilderNFTSeason02Fixtures() {
  return loadFixture(deployBuilderNFTSeason02Fixtures);
}

export async function loadProtocolFixtures() {
  return loadFixture(deployProtocolFixtures);
}

export async function loadEASFixtures() {
  return loadFixture(deployEASContracts);
}
