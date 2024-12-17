import { getAddress } from 'viem';

import { deployProtocolContract } from '../deployProtocol';
import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';

describe('Proxy and Initialization', function () {
  it('Should set the correct admin and implementation', async function () {
    const { ScoutTokenERC20 } = await deployScoutTokenERC20();

    const { protocolAdminAccount, ScoutProtocolProxyContract, ScoutProtocolImplementationContract } =
      await deployProtocolContract({
        ScoutTokenERC20Address: ScoutTokenERC20.address
      });

    const proxyAdminAddress = await ScoutProtocolProxyContract.read.admin();
    const proxyImplementationAddress = await ScoutProtocolProxyContract.read.implementation();

    expect(proxyAdminAddress).toBe(protocolAdminAccount.account.address);
    expect(proxyImplementationAddress).toBe(getAddress(ScoutProtocolImplementationContract.address));
    expect(ScoutProtocolImplementationContract.address).not.toBe(getAddress(ScoutProtocolProxyContract.address));
  });
});
