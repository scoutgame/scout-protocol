import { getAddress } from 'viem';

import { deployProtocolContract } from '../deployProtocol';
import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin and implementation', async function () {
    const { ProtocolERC20 } = await deployScoutTokenERC20();

    const { protocolAdminAccount, ScoutProtocolProxyContract, ScoutProtocolImplementationContract } =
      await deployProtocolContract({
        ProtocolERC20Address: ProtocolERC20.address
      });

    const proxyAdminAddress = await ScoutProtocolProxyContract.read.admin();
    const proxyImplementationAddress = await ScoutProtocolProxyContract.read.implementation();
    const erc20ContractAddress = await ScoutProtocolProxyContract.read.claimsToken();

    expect(proxyAdminAddress).toBe(protocolAdminAccount.account.address);
    expect(proxyImplementationAddress).toBe(getAddress(ScoutProtocolImplementationContract.address));
    expect(ScoutProtocolImplementationContract.address).not.toBe(getAddress(ScoutProtocolProxyContract.address));
    expect(erc20ContractAddress).toBe(getAddress(ProtocolERC20.address));
  });
});
