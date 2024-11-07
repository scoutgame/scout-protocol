import { viem } from 'hardhat';
import { keccak256, toBytes, parseEventLogs } from 'viem';

import { generateWallets, type GeneratedWallet } from '../../../generateWallets';

export const ADMIN_SLOT = keccak256(toBytes('Protocol.admin'));
export const CLAIM_MANAGER_SLOT = keccak256(toBytes('Protocol.claimsManager'));

export const EAS_ATTESTER_SLOT = keccak256(toBytes('Protocol.easAttester'));
export const SECONDARY_EAS_ATTESTER_SLOT = keccak256(toBytes('Protocol.easAttesterSecondary'));

async function deployTestAccessControl() {
  const { adminAccount, userAccount } = await generateWallets();

  const testAccessControlContract = await viem.deployContract('TestProtocolAccessControl', [], {
    client: { wallet: adminAccount }
  });

  return {
    adminAccount,
    userAccount,
    testAccessControlContract
  };
}

describe('ProtocolAccessControl', function () {
  let testAccessControlContract: Awaited<ReturnType<typeof deployTestAccessControl>>['testAccessControlContract'];
  let admin: GeneratedWallet;
  let user: GeneratedWallet;

  beforeEach(async () => {
    ({ adminAccount: admin, userAccount: user, testAccessControlContract } = await deployTestAccessControl());
  });

  describe('transferAdmin', function () {
    describe('effects', function () {
      it('allows admin to transfer admin', async function () {
        await testAccessControlContract.write.transferAdmin([user.account.address], {
          account: admin.account
        });

        const newAdmin = await testAccessControlContract.read.admin();

        expect(newAdmin).toEqual(user.account.address);

        // Make sure the old admin is no longer an admin
        await expect(
          testAccessControlContract.write.transferAdmin([user.account.address], {
            account: admin.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });

    describe('permissions', function () {
      it('reverts when not called by admin', async function () {
        await expect(
          testAccessControlContract.write.transferAdmin([user.account.address], {
            account: user.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });

    describe('validations', function () {
      it('reverts when setting to zero address', async function () {
        await expect(
          testAccessControlContract.write.transferAdmin(['0x0000000000000000000000000000000000000000'], {
            account: admin.account
          })
        ).rejects.toThrow('Invalid account. Cannot be empty');
      });
    });
  });

  describe('setRole', function () {
    describe('effects', function () {
      it('sets a role to a new account', async function () {
        await testAccessControlContract.write.setRole([ADMIN_SLOT, user.account.address], {
          account: admin.account
        });

        const holder = await testAccessControlContract.read.roleHolder([ADMIN_SLOT]);

        expect(holder).toEqual(user.account.address);
      });
    });

    describe('events', function () {
      it('emits a RoleTransferred event with roleName, previous and new holder if the new holder is different from the previous one', async function () {
        const transferRoleTx = await testAccessControlContract.write.setRole([ADMIN_SLOT, user.account.address], {
          account: admin.account
        });

        const receipt = await user.getTransactionReceipt({ hash: transferRoleTx });

        const logs = parseEventLogs({
          abi: testAccessControlContract.abi,
          logs: receipt.logs,
          eventName: 'RoleTransferred'
        });

        const event = logs[0];

        expect(event.args).toMatchObject({
          roleName: 'Admin',
          previousHolder: admin.account.address,
          newHolder: user.account.address
        });

        const secondTransferRoleTx = await testAccessControlContract.write.setRole([ADMIN_SLOT, user.account.address], {
          account: user.account
        });

        const secondReceipt = await user.getTransactionReceipt({ hash: secondTransferRoleTx });

        const secondLogs = parseEventLogs({
          abi: testAccessControlContract.abi,
          logs: secondReceipt.logs,
          eventName: 'RoleTransferred'
        });

        expect(secondLogs).toHaveLength(0);
      });
    });

    describe('validations', function () {
      it('reverts when setting to zero address', async function () {
        await expect(
          testAccessControlContract.write.setRole([EAS_ATTESTER_SLOT, '0x0000000000000000000000000000000000000000'], {
            account: admin.account
          })
        ).rejects.toThrow('Invalid account. Cannot be empty');
      });
    });
  });
});
