import { getAddress } from 'viem';

import { NULL_ADDRESS } from '../../../../lib/constants';
import type { EASTestFixture } from '../../../deployEAS';
import { loadEASFixtures } from '../../../fixtures';
import { generateWallets, type GeneratedWallet } from '../../../generateWallets';

describe('ProtocolEASResolver', function () {
  let eas: EASTestFixture;
  let easResolverAdmin: GeneratedWallet;
  let user: GeneratedWallet;

  beforeEach(async () => {
    eas = await loadEASFixtures();

    ({ userAccount: user } = await generateWallets());

    easResolverAdmin = eas.easResolverAdminWallet;
  });

  describe('write', function () {
    describe('setAttesterWallet', function () {
      describe('effects', function () {
        it('updates the attester wallet correctly', async function () {
          const { userAccount } = await generateWallets();

          await eas.ProtocolEASResolverContract.write.setAttesterWallet([userAccount.account.address], {
            account: easResolverAdmin.account
          });

          const newAttester = await eas.ProtocolEASResolverContract.read.attesterWallet();

          expect(newAttester).toEqual(getAddress(userAccount.account.address));
        });
      });

      describe('permissions', function () {
        it('allows authorized users', async function () {
          const { userAccount } = await generateWallets();

          await expect(
            eas.ProtocolEASResolverContract.write.setAttesterWallet([userAccount.account.address], {
              account: easResolverAdmin.account
            })
          ).resolves.not.toThrow();
        });

        it('denies unauthorized users', async function () {
          const { userAccount } = await generateWallets();

          await expect(
            eas.ProtocolEASResolverContract.write.setAttesterWallet([userAccount.account.address], {
              account: user.account
            })
          ).rejects.toThrow();
        });
      });

      describe('validations', function () {
        it('reverts when input is invalid', async function () {
          await expect(
            eas.ProtocolEASResolverContract.write.setAttesterWallet([NULL_ADDRESS], {
              account: easResolverAdmin.account
            })
          ).rejects.toThrow('Invalid attester wallet address');
        });
      });
    });

    describe('rolloverAttesterWallet', function () {
      describe('effects', function () {
        it('updates the attester wallets correctly and sets the current assester as secondary attester', async function () {
          const { userAccount } = await generateWallets();

          const currentAttester = await eas.ProtocolEASResolverContract.read.attesterWallet();

          await eas.ProtocolEASResolverContract.write.rolloverAttesterWallet([userAccount.account.address], {
            account: easResolverAdmin.account
          });

          const newAttester = await eas.ProtocolEASResolverContract.read.attesterWallet();
          const secondaryAttester = await eas.ProtocolEASResolverContract.read.secondaryAttesterWallet();

          console.log({
            currentAttester,
            newAttester,
            secondaryAttester,
            user: userAccount.account.address,
            admin: easResolverAdmin.account.address
          });

          expect(newAttester).toEqual(getAddress(userAccount.account.address));
          expect(secondaryAttester).toEqual(getAddress(easResolverAdmin.account.address));
        });
      });

      describe('permissions', function () {
        it('allows authorized users', async function () {
          const { userAccount } = await generateWallets();

          await expect(
            eas.ProtocolEASResolverContract.write.rolloverAttesterWallet([userAccount.account.address], {
              account: easResolverAdmin.account
            })
          ).resolves.not.toThrow();
        });

        it('denies unauthorized users', async function () {
          const { userAccount } = await generateWallets();

          await expect(
            eas.ProtocolEASResolverContract.write.rolloverAttesterWallet([userAccount.account.address], {
              account: user.account
            })
          ).rejects.toThrow();
        });
      });

      describe('validations', function () {
        it('reverts when input is invalid', async function () {
          await expect(
            eas.ProtocolEASResolverContract.write.rolloverAttesterWallet([NULL_ADDRESS], {
              account: easResolverAdmin.account
            })
          ).rejects.toThrow('Invalid attester wallet address');
        });
      });
    });

    describe('transferAdmin', function () {
      describe('effects', function () {
        it('updates the admin correctly', async function () {
          const { userAccount } = await generateWallets();

          await eas.ProtocolEASResolverContract.write.transferAdmin([userAccount.account.address], {
            account: easResolverAdmin.account
          });

          const newAdmin = await eas.ProtocolEASResolverContract.read.admin();

          expect(newAdmin).toEqual(getAddress(userAccount.account.address));
        });
      });

      describe('permissions', function () {
        it('allows authorized users', async function () {
          const { userAccount } = await generateWallets();

          await expect(
            eas.ProtocolEASResolverContract.write.transferAdmin([userAccount.account.address], {
              account: easResolverAdmin.account
            })
          ).resolves.not.toThrow();
        });

        it('denies unauthorized users', async function () {
          const { userAccount } = await generateWallets();

          await expect(
            eas.ProtocolEASResolverContract.write.transferAdmin([userAccount.account.address], {
              account: user.account
            })
          ).rejects.toThrow();
        });
      });

      describe('validations', function () {
        it('reverts when input is invalid', async function () {
          await expect(
            eas.ProtocolEASResolverContract.write.transferAdmin([NULL_ADDRESS], {
              account: easResolverAdmin.account
            })
          ).rejects.toThrow('Invalid account. Cannot be empty');
        });
      });
    });
  });
});
