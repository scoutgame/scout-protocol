import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';

import { deployBuilderNftContract } from './deployBuilderNft';
import { deployBuilderNftPreSeason02Contract } from './deployBuilderNftPreSeason02';
import { deployBuilderNftStarterPackContract } from './deployBuilderNftStarterPack';
import { deployEASContracts } from './deployEAS';
import { deployProtocolContract } from './deployProtocol';
import { deployScoutProtocolBuilderNftContract } from './deployScoutProtocolBuilderNft';
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

async function deployBuilderNFTPreSeason02Fixtures() {
  const token = await deployTestUSDC();
  const builderNftSeason02 = await deployBuilderNftPreSeason02Contract({
    USDCAddress: token.USDC.address
  });

  return { token, builderNftSeason02 };
}

async function deployScoutProtocolBuilderNFTFixtures() {
  const token = await deployScoutTokenERC20();
  const scoutProtocolBuilderNft = await deployScoutProtocolBuilderNftContract({
    ScoutProtocolERC20Address: token.ProtocolERC20.address
  });

  return { token, scoutProtocolBuilderNft };
}

export async function loadScoutTokenERC20Fixtures() {
  return loadFixture(deployScoutTokenERC20);
}

export async function loadBuilderNFTPreSeason02Fixtures() {
  return loadFixture(deployBuilderNFTPreSeason02Fixtures);
}

export async function loadScoutProtocolBuilderNFTFixtures() {
  return loadFixture(deployScoutProtocolBuilderNFTFixtures);
}

export async function loadProtocolFixtures() {
  return loadFixture(deployProtocolFixtures);
}

export async function loadEASFixtures() {
  return loadFixture(deployEASContracts);
}
