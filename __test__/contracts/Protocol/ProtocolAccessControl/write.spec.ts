import { viem } from 'hardhat';
import { keccak256, parseEventLogs, toBytes } from 'viem';

import { generateWallets, type GeneratedWallet } from '../../../generateWallets';

export const ADMIN_SLOT = keccak256(toBytes('Protocol.admin'));
export const CLAIM_MANAGER_SLOT = keccak256(toBytes('Protocol.claimsManager'));

export const EAS_ATTESTER_SLOT = keccak256(toBytes('Protocol.easAttester'));
export const SECONDARY_EAS_ATTESTER_SLOT = keccak256(toBytes('Protocol.easAttesterSecondary'));

export const PAUSER_SLOT = keccak256(toBytes('Protocol.pauser'));

async function deployTestAccessControl() {
  const { adminAccount, userAccount, secondUserAccount } = await generateWallets();

  const testAccessControlContract = await viem.deployContract('TestProtocolAccessControl', [], {
    client: { wallet: adminAccount }
  });

  return {
    adminAccount,
    userAccount,
    secondUserAccount,
    testAccessControlContract
  };
}

describe('ProtocolAccessControl', function () {
  let testAccessControlContract: Awaited<ReturnType<typeof deployTestAccessControl>>['testAccessControlContract'];
  let admin: GeneratedWallet;
  let user: GeneratedWallet;
  let pauser: GeneratedWallet;

  beforeEach(async () => {
    ({
      adminAccount: admin,
      userAccount: user,
      testAccessControlContract,
      secondUserAccount: pauser
    } = await deployTestAccessControl());
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

  describe('pause', function () {
    describe('effects', function () {
      it('marks the contract as paused', async function () {
        await testAccessControlContract.write.pause({ account: admin.account });

        const paused = await testAccessControlContract.read.isPaused();
        expect(paused).toEqual(true);
      });
    });

    describe('permissions', function () {
      it('can be paused by the pauser role ', async function () {
        await testAccessControlContract.write.setPauser([pauser.account.address], { account: admin.account });
        await testAccessControlContract.write.pause({ account: pauser.account });

        const paused = await testAccessControlContract.read.isPaused();
        expect(paused).toEqual(true);
      });
      it('reverts when called by non-pauser and non-admin', async function () {
        await expect(testAccessControlContract.write.pause({ account: user.account })).rejects.toThrow(
          'Caller is not the pauser or admin'
        );
      });
    });

    describe('events', function () {
      it('emits Paused event when paused', async function () {
        const pauseTx = await testAccessControlContract.write.pause({ account: admin.account });

        const receipt = await admin.getTransactionReceipt({ hash: pauseTx });

        const logs = parseEventLogs({
          abi: testAccessControlContract.abi,
          logs: receipt.logs,
          eventName: 'Paused'
        });

        const event = logs[0];

        expect(event.args).toMatchObject({
          _callerAddress: admin.account.address
        });
      });
    });
  });

  describe('unPause', function () {
    beforeEach(async () => {
      await testAccessControlContract.write.pause({ account: admin.account });
    });

    describe('effects', function () {
      it('allows admin to unpause the contract', async function () {
        await testAccessControlContract.write.unPause({ account: admin.account });

        const paused = await testAccessControlContract.read.isPaused();
        expect(paused).toEqual(false);
      });
    });

    describe('permissions', function () {
      it('reverts when called by non-admin', async function () {
        await expect(testAccessControlContract.write.unPause({ account: user.account })).rejects.toThrow(
          'Caller is not the admin'
        );
      });
    });

    describe('events', function () {
      it('emits Unpaused event when unpaused', async function () {
        const unpauseTx = await testAccessControlContract.write.unPause({ account: admin.account });

        const receipt = await admin.getTransactionReceipt({ hash: unpauseTx });

        const logs = parseEventLogs({
          abi: testAccessControlContract.abi,
          logs: receipt.logs,
          eventName: 'Unpaused'
        });

        const event = logs[0];

        expect(event.args).toMatchObject({
          _callerAddress: admin.account.address
        });
      });
    });
  });

  describe('testPaused', function () {
    it('reverts when the contract is paused', async function () {
      await testAccessControlContract.write.pause({ account: admin.account });

      await expect(testAccessControlContract.read.testPaused({ account: admin.account })).rejects.toThrow(
        'Contract is paused'
      );
    });

    it('succeeds when the contract is not paused', async function () {
      const paused = await testAccessControlContract.read.isPaused();
      if (paused) {
        await testAccessControlContract.write.unPause({ account: admin.account });
      }

      await testAccessControlContract.read.testPaused({ account: admin.account });
    });
  });

  describe('setPauser', function () {
    describe('effects', function () {
      it('allows admin to set a new pauser', async function () {
        await testAccessControlContract.write.setPauser([pauser.account.address], {
          account: admin.account
        });

        const newPauser = await testAccessControlContract.read.pauser();
        expect(newPauser).toEqual(pauser.account.address);
      });
    });

    describe('permissions', function () {
      it('reverts when not called by admin', async function () {
        await expect(
          testAccessControlContract.write.setPauser([pauser.account.address], {
            account: user.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });

    describe('validations', function () {
      it('reverts when setting to zero address', async function () {
        await expect(
          testAccessControlContract.write.setPauser(['0x0000000000000000000000000000000000000000'], {
            account: admin.account
          })
        ).rejects.toThrow('Invalid account. Cannot be empty');
      });
    });

    describe('events', function () {
      it('emits a RoleTransferred event when pauser is changed', async function () {
        const tx = await testAccessControlContract.write.setPauser([pauser.account.address], {
          account: admin.account
        });

        const receipt = await admin.getTransactionReceipt({ hash: tx });
        const logs = parseEventLogs({
          abi: testAccessControlContract.abi,
          logs: receipt.logs,
          eventName: 'RoleTransferred'
        });

        const event = logs[0];
        expect(event.args).toMatchObject({
          roleName: 'Pauser',
          previousHolder: '0x0000000000000000000000000000000000000000',
          newHolder: pauser.account.address
        });
      });
    });
  });
});
