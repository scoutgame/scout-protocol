import type { ProvableClaim } from '@charmverse/core/protocol';
import { generateMerkleTree, getMerkleProofs } from '@charmverse/core/protocol';
import { mine, time } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { keccak256, randomBytes } from 'ethers';

import { type ProtocolTestFixture } from '../../../../deployProtocol';
import type { ScoutTokenERC20TestFixture } from '../../../../deployScoutTokenERC20';
import { loadProtocolFixtures } from '../../../../fixtures';
import { generateWallets, walletFromKey, type GeneratedWallet } from '../../../../generateWallets';

describe('ScoutProtocolImplementation', function () {
  let protocol: ProtocolTestFixture;
  let token: ScoutTokenERC20TestFixture;
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

    await token.transferScoutTokenERC20({
      args: { to: protocol.protocolContract.address, amount: 100_000 },
      wallet: token.ScoutTokenERC20AdminAccount
    });

    await protocol.protocolContract.write.setWeeklyMerkleRoot([
      {
        isoWeek: week,
        merkleRoot: `0x${merkleTree.rootHash}`,
        merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
        validUntil: BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
      }
    ]);
  });

  describe('multiClaim', function () {
    describe('effects', function () {
      it('allows a user to perform multiple claims in a single call', async function () {
        const weeks = [week, '2024-W42', '2024-W43'];

        for (let i = 0; i < weeks.length; i++) {
          const _week = weeks[i];

          await protocol.protocolContract.write.setWeeklyMerkleRoot(
            [
              {
                isoWeek: _week,
                merkleRoot: `0x${merkleTree.rootHash}`,
                merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
                validUntil: BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
              }
            ],
            {
              account: admin.account
            }
          );
        }

        const claimData = weeks.map((_week) => ({ week: _week, amount: BigInt(userClaim.amount), proofs }));

        await protocol.protocolContract.write.multiClaim([claimData], { account: user.account });

        const balance = await token.balanceOfScoutTokenERC20({ account: user.account.address });
        expect(balance).toEqual(userClaim.amount * weeks.length);
      });

      it('does not have any effect if a single claim is invalid', async function () {
        const latest = await time.latest();
        const weeks = [week, '2024-W42', '2024-W43'];

        for (let i = 0; i < weeks.length; i++) {
          const _week = weeks[i];

          await protocol.protocolContract.write.setWeeklyMerkleRoot(
            [
              {
                isoWeek: _week,
                merkleRoot: `0x${merkleTree.rootHash}`,
                merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
                validUntil:
                  i === weeks.length - 1
                    ? // Have one claim in the past
                      BigInt(latest + 100)
                    : BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
              }
            ],
            {
              account: admin.account
            }
          );
        }

        await mine(10, { interval: 2000 });

        const claimData = weeks.map((_week) => ({ week: _week, amount: BigInt(userClaim.amount), proofs }));

        await expect(
          protocol.protocolContract.write.multiClaim([claimData], { account: user.account })
        ).rejects.toThrow('Claiming period expired');

        const balance = await token.balanceOfScoutTokenERC20({ account: user.account.address });
        expect(balance).toEqual(0);

        for (const _week of weeks) {
          const claimed = await protocol.protocolContract.read.hasClaimed([_week, user.account.address]);
          expect(claimed).toBe(false);
        }
      });
    });
  });

  describe('claim', function () {
    describe('effects', function () {
      it('allows a user to claim tokens correctly', async function () {
        await protocol.protocolContract.write.claim([{ week, amount: BigInt(userClaim.amount), proofs }], {
          account: user.account
        });

        const balance = await token.balanceOfScoutTokenERC20({ account: user.account.address });

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
          protocol.protocolContract.write.claim([{ week, amount: BigInt(userClaim.amount), proofs }], {
            account: user.account
          })
        ).rejects.toThrow('Contract is paused');
      });
    });

    describe('validations', function () {
      it('denies claims if user has already claimed', async function () {
        await protocol.protocolContract.write.claim([{ week, amount: BigInt(userClaim.amount), proofs }], {
          account: user.account
        });

        await expect(
          protocol.protocolContract.write.claim([{ week, amount: BigInt(userClaim.amount), proofs }], {
            account: user.account
          })
        ).rejects.toThrow('You have already claimed for this week.');
      });

      it('denies claims if user is at a time too far in the future', async function () {
        const latestTimestamp = await time.latest();

        const oldWeek = '2024-W_Expired';

        await protocol.protocolContract.write.setWeeklyMerkleRoot([
          {
            isoWeek: oldWeek,
            merkleRoot: `0x${merkleTree.rootHash}`,
            merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
            validUntil: BigInt(latestTimestamp + 1000)
          }
        ]);

        await mine(2, { interval: 2000 });

        await expect(
          protocol.protocolContract.write.claim([{ week: oldWeek, amount: BigInt(userClaim.amount), proofs }], {
            account: user.account
          })
        ).rejects.toThrow('Claiming period expired');
      });

      it('reverts with invalid merkle proof', async function () {
        const invalidProofs = [
          '0x11fef743eb2ba923c1ffe0641f5a75074645a3dbac802311e64110fe3ee522b7',
          '0x22fef743eb2ba923c1ffe0641f5a75074645a3dbac802311e64110fe3ee522b7'
        ];
        await expect(
          protocol.protocolContract.write.claim(
            [{ week, amount: BigInt(userClaim.amount), proofs: invalidProofs as any }],
            {
              account: user.account
            }
          )
        ).rejects.toThrow('Invalid Merkle proof.');
      });

      it('reverts when merkle root is not set', async function () {
        const newWeek = '2024-W55';
        await expect(
          protocol.protocolContract.write.claim(
            [{ week: newWeek, amount: BigInt(userClaim.amount), proofs: proofs as any }],
            {
              account: user.account
            }
          )
        ).rejects.toThrow('No data for this week');
      });

      it('reverts when contract balance is insufficient', async function () {
        await expect(
          token.transferScoutTokenERC20({
            args: {
              to: admin.account.address,
              amount: await token.balanceOfScoutTokenERC20({
                account: protocol.protocolContract.address
              })
            },
            wallet: admin
          })
        ).rejects.toThrow('ERC20InsufficientBalance');
      });
    });
  });

  describe('setWeeklyMerkleRoot', function () {
    describe('effects', function () {
      it('allows admin to set merkle root correctly', async function () {
        await protocol.protocolContract.write.setWeeklyMerkleRoot([
          {
            isoWeek: week,
            merkleRoot: `0x${merkleTree.rootHash}`,
            merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
            validUntil: BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
          }
        ]);

        const merkleRoot = await protocol.protocolContract.read.getWeeklyMerkleRoot([week]);

        expect(merkleRoot).toEqual({
          isoWeek: week,
          merkleRoot: `0x${merkleTree.rootHash}`,
          merkleTreeUri: 'https://ipfs.com/gateway/<content-hash>',
          validUntil: expect.any(BigInt)
        });
      });

      it('sets the merkle root with a unique key', async function () {
        function generateRandomMerkleHash(): string {
          // Generate random bytes
          const randomBytesData = randomBytes(32);

          // Hash the random bytes to produce a bytes32 hash
          const hash = keccak256(randomBytesData);

          return hash;
        }

        const weekArray = Array.from({ length: 10 }, (_, i) => ({
          isoWeek: `2024-W${i}`,
          merkleRoot: `${generateRandomMerkleHash()}` as `0x${string}`,
          merkleTreeUri: `https://ipfs.com/gateway/<content-hash>/${i}`,
          validUntil: BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
        }));

        for (const _week of weekArray) {
          await protocol.protocolContract.write.setWeeklyMerkleRoot([_week], {
            account: admin.account
          });
        }

        const merkleRoots = await Promise.all(
          weekArray.map((_week) => protocol.protocolContract.read.getWeeklyMerkleRoot([_week.isoWeek]))
        );

        for (let i = 0; i < merkleRoots.length; i++) {
          expect(merkleRoots[i]).toEqual(weekArray[i]);
        }

        const uniqueMerkleRoots = new Set(merkleRoots.map((root) => root.merkleRoot));
        expect(uniqueMerkleRoots.size).toEqual(weekArray.length);
      });
    });

    describe('permissions', function () {
      it('reverts when the contract is paused', async function () {
        // Pause the contract
        await protocol.protocolContract.write.pause({ account: admin.account });

        // Attempt to set merkle root while paused
        await expect(
          protocol.protocolContract.write.setWeeklyMerkleRoot(
            [
              {
                isoWeek: week,
                merkleRoot: `0x${merkleTree.rootHash}`,
                merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
                validUntil: BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
              }
            ],
            {
              account: admin.account
            }
          )
        ).rejects.toThrow('Contract is paused');
      });

      it('reverts when not called by admin', async function () {
        await expect(
          protocol.protocolContract.write.setWeeklyMerkleRoot(
            [
              {
                isoWeek: week,
                merkleRoot: `0x${merkleTree.rootHash}`,
                merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
                validUntil: BigInt(Math.round(Date.now() / 1000) + 60 * 60 * 24 * 26)
              }
            ],
            {
              account: user.account
            }
          )
        ).rejects.toThrow('Proxy: caller is not the claim manager');
      });

      it('allows the claims manager to set the merkle root', async function () {
        await protocol.protocolContract.write.setClaimsManager([user.account.address], {
          account: protocol.protocolAdminAccount.account
        });

        const newMerkleRoot = {
          isoWeek: week,
          merkleRoot: `0x${merkleTree.rootHash}`,
          merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
          validUntil: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 26)
        } as const;

        await protocol.protocolContract.write.setWeeklyMerkleRoot([newMerkleRoot], {
          account: user.account
        });

        const merkleRoot = await protocol.protocolContract.read.getWeeklyMerkleRoot([week]);

        expect(merkleRoot).toMatchObject({
          isoWeek: week,
          merkleRoot: `0x${merkleTree.rootHash}`,
          merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
          validUntil: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 26)
        });
      });
    });

    describe('validations', function () {
      it('reverts when the validUntil is in the past', async function () {
        await expect(
          protocol.protocolContract.write.setWeeklyMerkleRoot([
            {
              isoWeek: week,
              merkleRoot: `0x${merkleTree.rootHash}`,
              merkleTreeUri: `https://ipfs.com/gateway/<content-hash>`,
              validUntil: BigInt(0)
            }
          ])
        ).rejects.toThrow('Claiming period must be in the future');
      });
    });
  });

  describe('setClaimsManager()', function () {
    describe('effects', function () {
      it('Sets the claims manager', async function () {
        const newClaimsManagerAccount = await walletFromKey();

        await expect(
          protocol.protocolContract.write.setClaimsManager([newClaimsManagerAccount.account.address], {
            account: protocol.protocolAdminAccount.account
          })
        ).resolves.toBeDefined();

        const claimsManager = await protocol.protocolContract.read.claimsManager();
        expect(claimsManager).toEqual(newClaimsManagerAccount.account.address);
      });
    });

    describe('permissions', function () {
      it('reverts when not called by admin', async function () {
        await expect(
          protocol.protocolContract.write.setClaimsManager([user.account.address], {
            account: user.account
          })
        ).rejects.toThrow('Caller is not the admin');
      });
    });
  });
});
