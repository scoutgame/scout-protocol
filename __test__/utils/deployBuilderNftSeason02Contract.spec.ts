import { getAddress } from 'viem';

import { deployBuilderNftSeason02Contract } from '../deployBuilderNftSeason02';
import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin, implementation, and payment token', async function () {
    const { ProtocolERC20 } = await deployScoutTokenERC20();

    const { builderProxyContract, builderImplementationContract, builderNftContract, builderNftAdminAccount } =
      await deployBuilderNftSeason02Contract({
        ScoutERC20Address: ProtocolERC20.address
      });

    const proxyAdmin = await builderProxyContract.read.admin();
    const proxyImplementation = await builderProxyContract.read.implementation();
    const erc20Contract = await builderNftContract.read.ERC20();

    expect(proxyAdmin).toBe(getAddress(builderNftAdminAccount.account.address));
    expect(proxyImplementation).toBe(getAddress(builderImplementationContract.address));
    expect(erc20Contract).toBe(getAddress(ProtocolERC20.address));
  });
});
