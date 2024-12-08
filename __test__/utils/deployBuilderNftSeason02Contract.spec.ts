import { getAddress } from 'viem';

import { deployBuilderNftSeason02Contract } from '../deployBuilderNftSeason02';
import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin, implementation', async function () {
    const { ProtocolERC20 } = await deployScoutTokenERC20();

    const { builderProxyContract, builderImplementationContract, builderNftAdminAccount } =
      await deployBuilderNftSeason02Contract({
        ScoutERC20Address: ProtocolERC20.address
      });

    const proxyAdmin = await builderProxyContract.read.admin();
    const proxyImplementation = await builderProxyContract.read.implementation();

    expect(proxyAdmin).toBe(getAddress(builderNftAdminAccount.account.address));
    expect(proxyImplementation).toBe(getAddress(builderImplementationContract.address));
  });
});
