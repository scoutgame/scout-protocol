import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployBuilderNftContract } from "./deployBuilderNft";
import { deployTestUSDC } from "./deployTestUSDC";

export async function deployContractFixtures() {

  const usdc = await deployTestUSDC()
  const builderNft = await deployBuilderNftContract({USDCContractAddress: usdc.USDC.address});
  // Return contracts and signers for tests
  return { usdc, builderNft};
}


export async function loadContractFixtures() {
  return loadFixture(deployContractFixtures);
}