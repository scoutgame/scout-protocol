import { getAddress } from 'viem';

import { deployProtocolContract } from '../deployProtocol';
import { deployProtocolERC20Token } from '../deployProtocolERC20Token';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin and implementation', async function () {
    const { ProtocolERC20 } = await deployProtocolERC20Token();

    const { protocolAdminAccount, protocolProxyContract, protocolImplementationContract } =
      await deployProtocolContract({
        ProtocolERC20Address: ProtocolERC20.address
      });

    const proxyAdminAddress = await protocolProxyContract.read.admin();
    const proxyImplementationAddress = await protocolProxyContract.read.implementation();
    const erc20ContractAddress = await protocolProxyContract.read.claimsToken();

    expect(proxyAdminAddress).toBe(protocolAdminAccount.account.address);
    expect(proxyImplementationAddress).toBe(getAddress(protocolImplementationContract.address));
    expect(protocolImplementationContract.address).not.toBe(getAddress(protocolProxyContract.address));
    expect(erc20ContractAddress).toBe(getAddress(ProtocolERC20.address));
  });
});
