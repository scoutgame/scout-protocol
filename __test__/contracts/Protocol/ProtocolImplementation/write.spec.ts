import { type ProtocolTestFixture } from '../../../deployProtocol';
import type { ProtocolERC20TestFixture } from '../../../deployProtocolERC20Token';
import { loadProtocolFixtures } from '../../../fixtures';
import { walletFromKey, type GeneratedWallet } from '../../../generateWallets';

describe('ProtocolImplementation', function () {
  let protocol: ProtocolTestFixture;
  let token: ProtocolERC20TestFixture;
  let admin: GeneratedWallet;
  let user: GeneratedWallet;
  const week = '2024-W41';
  const amount = 100;
  const proofs = [
    '0x88fef743eb2ba108c1ffe0641f5a75074645a3dbac802311e64110fe3ee522b7',
    '0x72857e15059e88e5883a147e689a03b9d4cd1df50b1edcaef92cc56e279a7677',
    '0xaecdc66c7cdd3464311f6e34612ea80b6bcdf07555ddf5e9e9481ef40a1894b0'
  ] as const;
  const rootHash = '9de37c56d9eeb93e34fd8764b168879ee52d3559abeb943d9d730efe002c52cc';

  beforeEach(async () => {
    const fixtures = await loadProtocolFixtures();

    token = fixtures.token;
    protocol = fixtures.protocol;
    admin = protocol.protocolAdminAccount;

    user = await walletFromKey({
      key: '57b7b9b29419b66ac8156f844a7b0eb18d94f729699b3f15a3d8817d3f5980a3',
      initialEthBalance: 1
    });

    await token.mintProtocolERC20To({ account: protocol.protocolContract.address, amount: 100_000 });

    await protocol.protocolContract.write.setMerkleRoot([week, `0x${rootHash}`]);
  });

  describe('claim', function () {
    describe('effects', function () {
      it('allows a user to claim tokens correctly', async function () {
        await protocol.protocolContract.write.claim([week, BigInt(amount), proofs], {
          account: user.account
        });

        const balance = await token.balanceOfProtocolERC20({ account: user.account.address });

        expect(balance).toEqual(amount);

        const claimed = await protocol.protocolContract.read.hasClaimed([week, user.account.address]);
        expect(claimed).toBe(true);
      });
    });

    describe('validations', function () {
      it('denies claims if user has already claimed', async function () {
        await protocol.protocolContract.write.claim([week, BigInt(amount), proofs], {
          account: user.account
        });

        await expect(
          protocol.protocolContract.write.claim([week, BigInt(amount), proofs], {
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
          protocol.protocolContract.write.claim([week, BigInt(amount), invalidProofs as any])
        ).rejects.toThrow('Invalid Merkle proof.');
      });

      it('reverts when merkle root is not set', async function () {
        const newWeek = '2024-W55';
        await expect(protocol.protocolContract.write.claim([newWeek, BigInt(amount), proofs as any])).rejects.toThrow(
          'Merkle root for this week is not set.'
        );
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
        await protocol.protocolContract.write.setMerkleRoot([week, `0x${rootHash}`]);

        const merkleRoot = await protocol.protocolContract.read.getMerkleRoot([week]);

        expect(merkleRoot).toEqual(`0x${rootHash}`);
      });
    });
  });
});
