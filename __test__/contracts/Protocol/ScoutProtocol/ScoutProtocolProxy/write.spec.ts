import { viem } from 'hardhat';
import { getAddress } from 'viem';

import { deployEASContracts } from '../../../../deployEAS';
import type { ProtocolTestFixture } from '../../../../deployProtocol';
import { loadProtocolFixtures } from '../../../../fixtures';
import { walletFromKey, type GeneratedWallet } from '../../../../generateWallets';

function deployImplementation() {
  return viem.deployContract('ScoutProtocolImplementation', []);
}

type DeployedImplementation = Awaited<ReturnType<typeof deployImplementation>>;

describe('ScoutProtocolProxy', function () {
  let protocol: ProtocolTestFixture;
  let protocolAdminAccount: GeneratedWallet;

  let newImplementation: DeployedImplementation;

  beforeEach(async () => {
    const fixtures = await loadProtocolFixtures();
    protocol = fixtures.protocol;
    protocolAdminAccount = protocol.protocolAdminAccount;
    newImplementation = await deployImplementation();
  });

  describe('setImplementation()', function () {
    describe('effects', function () {
      it('Updates the implementation address correctly', async function () {
        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation([newImplementation.address], {
            account: protocol.protocolAdminAccount.account
          })
        ).resolves.toBeDefined();

        const implementationAddress = await protocol.ScoutProtocolProxyContract.read.implementation();
        expect(getAddress(implementationAddress)).toEqual(getAddress(newImplementation.address));
      });
    });

    describe('permissions', function () {
      it('Allows admin to set implementation', async function () {
        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation([newImplementation.address], {
            account: protocol.protocolAdminAccount.account
          })
        ).resolves.toBeDefined();
      });

      it('Prevents non-admin from setting implementation', async function () {
        const userAccount = await walletFromKey();
        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation([newImplementation.address], {
            account: userAccount.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });

    describe('validations', function () {
      it('Reverts if new implementation address is zero address', async function () {
        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation(['0x0000000000000000000000000000000000000000'], {
            account: protocolAdminAccount.account
          })
        ).rejects.toThrow('Invalid implementation address');
      });

      it('Reverts if new implementation address is an EOA wallet', async function () {
        const wallet = await walletFromKey();

        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation([wallet.account.address], {
            account: protocolAdminAccount.account
          })
        ).rejects.toThrow('Invalid address, must be a smart contract');
      });

      it('Reverts if new implementation address cannot accept the upgrade', async function () {
        const badContract = await deployEASContracts().then((c) => c.ProtocolEASResolverContract);

        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation([badContract.address], {
            account: protocolAdminAccount.account
          })
        ).rejects.toThrow('Invalid address, must accept the upgrade');
      });

      it('Reverts if new implementation address is the same as current', async function () {
        const currentImplementation = await protocol.ScoutProtocolProxyContract.read.implementation();

        await expect(
          protocol.ScoutProtocolProxyContract.write.setImplementation([currentImplementation], {
            account: protocolAdminAccount.account
          })
        ).rejects.toThrow('New implementation must be different');
      });
    });
  });
});
