import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';

import { deployBuilderNftContract } from './deployBuilderNft';
import { deployProtocolContract } from './deployProtocol';
import { deployProtocolERC20Token } from './deployProtocolERC20Token';
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

async function deployProtocolFixtures() {
  const token = await deployProtocolERC20Token();
  const protocol = await deployProtocolContract({ ProtocolERC20Address: token.ProtocolERC20.address });

  return { token, protocol };
}

export async function loadProtocolFixtures() {
  return loadFixture(deployProtocolFixtures);
}
