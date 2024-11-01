import type { ProtocolTestFixture } from '../../../deployProtocol';
import { loadProtocolFixtures } from '../../../fixtures';
import type { GeneratedWallet } from '../../../generateWallets';
import { walletFromKey } from '../../../generateWallets';

describe('ProtocolImplementation', function () {
  let protocol: ProtocolTestFixture;
  let admin: GeneratedWallet;
  let user: GeneratedWallet;

  beforeEach(async () => {
    const fixtures = await loadProtocolFixtures();

    protocol = fixtures.protocol;
    admin = protocol.protocolAdminAccount;

    user = await walletFromKey({
      key: '57b7b9b29419b66ac8156f844a7b0eb18d94f729699b3f15a3d8817d3f5980a3',
      initialEthBalance: 1
    });
  });

  describe('setAdmin', function () {
    describe('effects', function () {
      it('allows admin to transfer admin', async function () {
        await protocol.protocolContract.write.setAdmin([user.account.address], {
          account: admin.account
        });

        const newAdmin = await protocol.protocolContract.read.admin();

        expect(newAdmin).toEqual(user.account.address);

        // Make sure the old admin is no longer an admin
        await expect(
          protocol.protocolContract.write.setAdmin([user.account.address], {
            account: admin.account
          })
        ).rejects.toThrow('Proxy: caller is not the admin');
      });
    });

    describe('permissions', function () {
      it('reverts when not called by admin', async function () {
        await expect(
          protocol.protocolContract.write.setAdmin([user.account.address], {
            account: user.account
          })
        ).rejects.toThrow('Proxy: caller is not the admin');
      });
    });

    describe('validations', function () {
      it('reverts when setting to zero address', async function () {
        await expect(
          protocol.protocolContract.write.setAdmin(['0x0000000000000000000000000000000000000000'], {
            account: admin.account
          })
        ).rejects.toThrow('Invalid admin address');
      });
    });
  });

  describe('setClaimsManager', function () {
    describe('effects', function () {
      it('allows admin to set claims manager correctly', async function () {
        await protocol.protocolContract.write.setClaimsManager([user.account.address], {
          account: admin.account
        });

        const claimsManager = await protocol.protocolContract.read.claimsManager();

        expect(claimsManager).toEqual(user.account.address);
      });
    });

    describe('permissions', function () {
      it('reverts when not called by admin', async function () {
        await expect(
          protocol.protocolContract.write.setClaimsManager([user.account.address], {
            account: user.account
          })
        ).rejects.toThrow('Proxy: caller is not the admin');
      });
    });

    describe('validations', function () {
      it('reverts when setting to zero address', async function () {
        await expect(
          protocol.protocolContract.write.setClaimsManager(['0x0000000000000000000000000000000000000000'], {
            account: admin.account
          })
        ).rejects.toThrow('Invalid address');
      });
    });
  });
});
