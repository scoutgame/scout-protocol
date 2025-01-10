import { getAddress } from 'viem';

import { deployScoutGamePreSeason02NftContract } from '../deployScoutGamePreSeason02NftContract';
import { deployTestUSDC } from '../deployTestUSDC';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin, implementation', async function () {
    const { USDC } = await deployTestUSDC();

    const { builderProxyContract, builderImplementationContract, builderNftContract, builderNftAdminAccount } =
      await deployScoutGamePreSeason02NftContract({
        USDCAddress: USDC.address
      });

    const proxyAdmin = await builderProxyContract.read.admin();
    const proxyImplementation = await builderProxyContract.read.implementation();
    const erc20 = await builderNftContract.read.ERC20Token();

    expect(proxyAdmin).toBe(getAddress(builderNftAdminAccount.account.address));
    expect(proxyImplementation).toBe(getAddress(builderImplementationContract.address));
    expect(erc20).toBe(getAddress(USDC.address));
    expect(await builderNftContract.read.name()).toBe('ScoutGame (PreSeason 02)');
    expect(await builderNftContract.read.symbol()).toBe('SCOUTGAME-P02');
  });
});
