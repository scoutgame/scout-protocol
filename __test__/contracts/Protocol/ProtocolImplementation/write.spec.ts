import { deployProtocolContract, type ProtocolTestFixture } from '../../../deployProtocol';
import type { ProtocolERC20TestFixture } from '../../../deployProtocolERC20Token';
import { deployProtocolERC20Token } from '../../../deployProtocolERC20Token';
import { walletFromKey, type GeneratedWallet } from '../../../generateWallets';

describe('ProtocolImplementation', function () {
  let protocol: ProtocolTestFixture;
  let token: ProtocolERC20TestFixture;
  let admin: GeneratedWallet;
  let user: GeneratedWallet;
  const week = '2024-W41';
  const amount = 100;
  const proofs = [
    // Left
    '3078333634343665463637313935343735333830316639643733433431356138304330653535306233323a343030',
    // Left
    '24caf43479f3026dcaab3542e27ca3a60bb7c2ba8dad845d81248191bd6e0032',
    // Right
    '3078443032393533383537323530443332454337323036346439453233323042343332393645353243303a353030'
  ];
  const rootHash = '62c93b02027192049fc5b6624108087af167b1e2eeecaa79b83900a03fc224df';

  beforeEach(async () => {
    token = await deployProtocolERC20Token();
    protocol = await deployProtocolContract({ ProtocolERC20Address: token.ProtocolERC20.address });
    admin = protocol.protocolAdminAccount;

    user = await walletFromKey({ key: '57b7b9b29419b66ac8156f844a7b0eb18d94f729699b3f15a3d8817d3f5980a3' });

    await token.mintProtocolERC20To({ account: protocol.protocolContract.address, amount: 100_000 });

    await protocol.protocolContract.write.setMerkleRoot([week, `0x${rootHash}`]);
  });

  describe('claim', function () {
    describe('effects', function () {
      it('allows a user to claim tokens correctly', async function () {
        await protocol.protocolContract.write.claim([week, BigInt(amount), proofs.map((p) => `0x${p}` as any)], {
          account: user.account
        });

        const balance = await token.balanceOfProtocolERC20({ account: user.account.address });

        expect(balance).toEqual(amount);

        const claimed = await protocol.protocolContract.read.hasClaimed([week, user.account.address]);
        expect(claimed).toBe(true);
      });
    });

    it('denies claims if user has already claimed', async function () {
      await protocol.protocolContract.write.claim([week, BigInt(amount), proofs.map((p) => `0x${p}` as any)], {
        account: user.account
      });

      await expect(
        protocol.protocolContract.write.claim([week, BigInt(amount), proofs.map((p) => `0x${p}` as any)], {
          account: user.account
        })
      ).rejects.toThrow('You have already claimed for this week.');
    });

    describe('validations', function () {
      it('reverts with invalid merkle proof', async function () {
        const invalidProofs = ['0xdeadbeef'];
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
        ).rejects.toThrow('Insufficient balance in contract.');
      });
    });
  });
});
