import { getAddress } from 'viem';

import { deployScoutProtocolBuilderNftContract } from '../deployScoutProtocolBuilderNft';
import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';

describe('Scout Protocol Builder NFT Proxy and Initialization', function () {
  it('Should set the correct admin, implementation and ERC20 token', async function () {
    const { ScoutTokenERC20 } = await deployScoutTokenERC20();

    const { builderProxyContract, builderImplementationContract, builderNftContract, builderNftAdminAccount } =
      await deployScoutProtocolBuilderNftContract({
        ScoutScoutTokenERC20Address: ScoutTokenERC20.address
      });

    const proxyAdmin = await builderProxyContract.read.admin();
    const proxyImplementation = await builderProxyContract.read.implementation();
    const erc20 = await builderNftContract.read.ERC20Token();

    expect(proxyAdmin).toBe(getAddress(builderNftAdminAccount.account.address));
    expect(proxyImplementation).toBe(getAddress(builderImplementationContract.address));
    expect(erc20).toBe(getAddress(ScoutTokenERC20.address));
  });
});
