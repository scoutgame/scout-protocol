import type { ProvableClaim } from '@charmverse/core/protocol';
import { generateMerkleTree, getMerkleProofs } from '@charmverse/core/protocol';

import { type ProtocolTestFixture } from '../../../deployProtocol';
import type { ProtocolERC20TestFixture } from '../../../deployScoutTokenERC20';
import { loadProtocolFixtures } from '../../../fixtures';
import { generateWallets, type GeneratedWallet } from '../../../generateWallets';

describe('ScoutProtocolImplementation', function () {
  let protocol: ProtocolTestFixture;
  let token: ProtocolERC20TestFixture;
  let admin: GeneratedWallet;
  let user: GeneratedWallet;

  let userClaim: ProvableClaim;

  let merkleTree: ReturnType<typeof generateMerkleTree>;
  let proofs: ReturnType<typeof getMerkleProofs>;

  let claims: ProvableClaim[];

  const week = '2024-W41';

  beforeAll(async () => {
    const { userAccount, secondUserAccount, thirdUserAccount } = await generateWallets();

    user = userAccount;

    userClaim = {
      address: userAccount.account.address,
      amount: 100
    };

    claims = [
      userClaim,
      {
        address: secondUserAccount.account.address,
        amount: 200
      },
      {
        address: thirdUserAccount.account.address,
        amount: 300
      }
    ];

    merkleTree = await generateMerkleTree(claims);
    proofs = getMerkleProofs(merkleTree.tree, claims[0]);
  });

  beforeEach(async () => {
    const fixtures = await loadProtocolFixtures();

    token = fixtures.token;
    protocol = fixtures.protocol;
    admin = protocol.protocolAdminAccount;

    await token.mintProtocolERC20To({ account: protocol.protocolContract.address, amount: 100_000 });

    await protocol.protocolContract.write.setMerkleRoot([week, `0x${merkleTree.rootHash}`]);
  });

  describe('claim', function () {
    describe('effects', function () {
      it('allows a user to claim tokens correctly', async function () {
        await protocol.protocolContract.write.claim([week, BigInt(userClaim.amount), proofs], {
          account: user.account
        });

        const balance = await token.balanceOfProtocolERC20({ account: user.account.address });

        expect(balance).toEqual(userClaim.amount);

        const claimed = await protocol.protocolContract.read.hasClaimed([week, user.account.address]);
        expect(claimed).toBe(true);
      });
    });

    describe('permissions', function () {
      it('reverts when the contract is paused', async function () {
        // Pause the contract
        await protocol.protocolContract.write.pause({ account: admin.account });

        // Attempt to claim while paused
        await expect(
          protocol.protocolContract.write.claim([week, BigInt(userClaim.amount), proofs], {
            account: user.account
          })
        ).rejects.toThrow('Contract is paused');
      });
    });

    describe('validations', function () {
      it('denies claims if user has already claimed', async function () {
        await protocol.protocolContract.write.claim([week, BigInt(userClaim.amount), proofs], {
          account: user.account
        });

        await expect(
          protocol.protocolContract.write.claim([week, BigInt(userClaim.amount), proofs], {
            account: user.account
          })
        ).rejects.toThrow('You have already claimed for this week.');
      });

      it('reverts with invalid merkle proof', async function () {
        const invalidProofs = [
          '0x11fef743eb2ba923c1ffe0641f5a75074645a3dbac802311e64110fe3ee522b7',
          '0x22fef743eb2ba923c1ffe0641f5a75074645a3dbac802311e64110fe3ee522b7'
        ];
        await expect(
          protocol.protocolContract.write.claim([week, BigInt(userClaim.amount), invalidProofs as any])
        ).rejects.toThrow('Invalid Merkle proof.');
      });

      it('reverts when merkle root is not set', async function () {
        const newWeek = '2024-W55';
        await expect(
          protocol.protocolContract.write.claim([newWeek, BigInt(userClaim.amount), proofs as any])
        ).rejects.toThrow('Merkle root for this week is not set.');
      });

      it('reverts when contract balance is insufficient', async function () {
        await expect(
          token.transferProtocolERC20({
            args: {
              to: admin.account.address,
              amount: await token.balanceOfProtocolERC20({
                account: protocol.protocolContract.address
              })
            },
            wallet: admin
          })
        ).rejects.toThrow('ERC20InsufficientBalance');
      });
    });
  });

  describe('setMerkleRoot', function () {
    describe('effects', function () {
      it('allows admin to set merkle root correctly', async function () {
        await protocol.protocolContract.write.setMerkleRoot([week, `0x${merkleTree.rootHash}`]);

        const merkleRoot = await protocol.protocolContract.read.getMerkleRoot([week]);

        expect(merkleRoot).toEqual(`0x${merkleTree.rootHash}`);
      });
    });

    describe('permissions', function () {
      it('reverts when the contract is paused', async function () {
        // Pause the contract
        await protocol.protocolContract.write.pause({ account: admin.account });

        // Attempt to set merkle root while paused
        await expect(
          protocol.protocolContract.write.setMerkleRoot([week, `0x${merkleTree.rootHash}`], {
            account: admin.account
          })
        ).rejects.toThrow('Contract is paused');
      });

      it('reverts when not called by admin', async function () {
        await expect(
          protocol.protocolContract.write.setMerkleRoot([week, `0x${merkleTree.rootHash}`], {
            account: user.account
          })
        ).rejects.toThrow('Proxy: caller is not the claim manager');
      });

      it('allows the claims manager to set the merkle root', async function () {
        await protocol.protocolContract.write.setClaimsManager([user.account.address], {
          account: protocol.protocolAdminAccount.account
        });

        await protocol.protocolContract.write.setMerkleRoot([week, `0x${merkleTree.rootHash}`], {
          account: user.account
        });

        const merkleRoot = await protocol.protocolContract.read.getMerkleRoot([week]);

        expect(merkleRoot).toEqual(`0x${merkleTree.rootHash}`);
      });
    });
  });
});
