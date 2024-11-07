import {
  decodeContributionReceiptAttestation,
  NULL_EAS_REF_UID,
  NULL_EVM_ADDRESS,
  type ContributionReceiptAttestation
} from '@charmverse/core/protocol';
import { getAddress } from 'viem';

import type { EASTestFixture } from '../../../deployEAS';
import { loadEASFixtures } from '../../../fixtures';
import { generateWallets, type GeneratedWallet } from '../../../generateWallets';

describe('ProtocolEASResolver', function () {
  let eas: EASTestFixture;
  let easResolverAdmin: GeneratedWallet;
  let easAttesterWallet: GeneratedWallet;
  let user: GeneratedWallet;

  beforeEach(async () => {
    eas = await loadEASFixtures();

    ({ userAccount: user } = await generateWallets());

    easAttesterWallet = eas.attester;

    easResolverAdmin = eas.easResolverAdminWallet;
  });
  describe('setAttesterWallet', function () {
    describe('effects', function () {
      it('updates the attester wallet correctly', async function () {
        const { userAccount } = await generateWallets();

        await eas.ProtocolEASResolverContract.write.setAttesterWallet([userAccount.account.address], {
          account: easResolverAdmin.account
        });

        const newAttester = await eas.ProtocolEASResolverContract.read.attester();

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
          eas.ProtocolEASResolverContract.write.setAttesterWallet([NULL_EVM_ADDRESS], {
            account: easResolverAdmin.account
          })
        ).rejects.toThrow('Invalid account. Cannot be empty');
      });
    });
  });

  describe('rolloverAttesterWallet', function () {
    describe('effects', function () {
      it('updates the attester wallets correctly and sets the current attester as secondary attester', async function () {
        const { userAccount } = await generateWallets();

        const attesterBeforeChange = await eas.ProtocolEASResolverContract.read.attester();

        await eas.ProtocolEASResolverContract.write.rolloverAttesterWallet([userAccount.account.address], {
          account: easResolverAdmin.account
        });

        const newAttester = await eas.ProtocolEASResolverContract.read.attester();
        const secondaryAttester = await eas.ProtocolEASResolverContract.read.secondaryAttester();

        expect(newAttester).toEqual(getAddress(userAccount.account.address));
        expect(secondaryAttester).toEqual(getAddress(attesterBeforeChange));
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
          eas.ProtocolEASResolverContract.write.rolloverAttesterWallet([NULL_EVM_ADDRESS], {
            account: easResolverAdmin.account
          })
        ).rejects.toThrow('Invalid account. Cannot be empty');
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
          eas.ProtocolEASResolverContract.write.transferAdmin([NULL_EVM_ADDRESS], {
            account: easResolverAdmin.account
          })
        ).rejects.toThrow('Invalid account. Cannot be empty');
      });
    });
  });

  describe('onAttest', function () {
    const data: ContributionReceiptAttestation = {
      description: 'test',
      userRefUID: NULL_EAS_REF_UID,
      metadataUrl: 'https://www.example.com',
      url: 'https://github.com/ethereum/ethereum-org-website/pull/100',
      type: 'merged_pr',
      value: 100
    };

    describe('validations', function () {
      it('allows the attester wallet to attest', async function () {
        const attestationUid = await eas.attestContributionReceipt({
          data,
          wallet: easAttesterWallet
        });

        const attestation = await eas.EASAttestationContract.read.getAttestation([attestationUid]);

        const decoded = decodeContributionReceiptAttestation(attestation.data);

        expect(decoded).toMatchObject(data);
      });

      it('prevents other wallets than the attester wallet from attesting', async function () {
        const attestationUid = await eas.attestContributionReceipt({
          data
        });

        const attestation = await eas.EASAttestationContract.read.getAttestation([attestationUid]);

        const decoded = decodeContributionReceiptAttestation(attestation.data);

        expect(decoded).toMatchObject(data);
      });
    });
  });
});
