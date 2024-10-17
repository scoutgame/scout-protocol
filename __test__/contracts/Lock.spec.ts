import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { viem } from 'hardhat';
import { getAddress, parseGwei, decodeEventLog } from 'viem';

describe('Lock.sol', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    const lockedAmount = parseGwei('1');
    const unlockTime = BigInt((await time.latest()) + ONE_YEAR_IN_SECS);

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await viem.getWalletClients();

    const lock = await viem.deployContract('Lock', [unlockTime], {
      value: lockedAmount
    });

    const publicClient = await viem.getPublicClient();

    return { lock, unlockTime, lockedAmount, owner, otherAccount, publicClient };
  }

  describe('Deployment', function () {
    it('Should set the right unlockTime', async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.read.unlockTime()).toEqual(unlockTime);
    });

    it('Should set the right owner', async function () {
      const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.read.owner()).toEqual(getAddress(owner.account.address));
    });

    it('Should receive and store the funds to lock', async function () {
      const { lock, lockedAmount, publicClient } = await loadFixture(deployOneYearLockFixture);

      expect(
        await publicClient.getBalance({
          address: lock.address
        })
      ).toEqual(lockedAmount);
    });

    it('Should fail if the unlockTime is not in the future', async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = BigInt(await time.latest());
      await expect(
        viem.deployContract('Lock', [latestTime], {
          value: 1n
        })
      ).rejects.toThrow('Unlock time should be in the future');
    });
  });

  describe('Withdrawals', function () {
    describe('Validations', function () {
      it('Should withdraw funds if the unlockTime has arrived and the owner calls it', async function () {
        const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.write.withdraw()).resolves.toMatch('0x');
      });

      it('Should revert with the right error if called too soon', async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.write.withdraw()).rejects.toThrow("You can't withdraw yet");
      });

      it('Should revert with the right error if called from another account', async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(deployOneYearLockFixture);

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We retrieve the contract with a different account to send a transaction
        const lockAsOtherAccount = await viem.getContractAt('Lock', lock.address, {
          client: { wallet: otherAccount }
        });
        await expect(lockAsOtherAccount.write.withdraw()).rejects.toThrow("You aren't the owner");
      });
    });

    describe('Events', function () {
      it('Should emit an event on withdrawals', async function () {
        const { lock, unlockTime, lockedAmount, publicClient, owner } = await loadFixture(deployOneYearLockFixture);

        await time.increaseTo(unlockTime);

        const hash = await lock.write.withdraw();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Get the logs from the receipt
        const logs = receipt.logs;

        // Define the event signature for the Withdrawal event (you can get this from the ABI)
        const eventSignature = 'Withdrawal(address,uint256)';

        // Decode the event log
        const decodedEvent = decodeEventLog({
          abi: lock.abi, // Assuming lock.abi is available
          data: logs[0].data,
          topics: logs[0].topics
        });

        // Assert the event emitted correctly
        expect(decodedEvent.eventName).toBe('Withdrawal');
        expect((decodedEvent.args as any).owner.toLowerCase()).toEqual(owner.account.address);
        expect((decodedEvent.args as any).amount).toEqual(lockedAmount);
      });
    });
  });
});
