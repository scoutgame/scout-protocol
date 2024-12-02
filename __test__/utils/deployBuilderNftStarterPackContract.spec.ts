import { getAddress } from 'viem';

import { NULL_ADDRESS } from '../../lib/constants';
import { deployBuilderNftStarterPackContract } from '../deployBuilderNftStarterPack';
import { deployTestUSDC } from '../deployTestUSDC';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin, implementation, and payment token', async function () {
    const { USDC } = await deployTestUSDC();

    const { builderProxyContract, builderNftContract, builderNftAdminAccount } =
      await deployBuilderNftStarterPackContract({
        USDCContractAddress: USDC.address
      });

    const proxyAdmin = await builderProxyContract.read.admin();
    const proxyImplementation = await builderProxyContract.read.implementation();
    const erc20Contract = await builderNftContract.read.getERC20ContractV2();

    expect(proxyAdmin).toBe(getAddress(builderNftAdminAccount.account.address));
    expect(proxyImplementation).not.toBe(NULL_ADDRESS);
    expect(erc20Contract).toBe(getAddress(USDC.address));
  });
});
