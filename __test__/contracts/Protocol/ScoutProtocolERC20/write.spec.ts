import { parseEventLogs } from 'viem';

import type { ScoutTokenERC20TestFixture } from '../../../deployScoutTokenERC20';
import { loadScoutTokenERC20Fixtures } from '../../../fixtures';
import { generateWallets, walletFromKey, type GeneratedWallet } from '../../../generateWallets';

describe('ScoutTokenERC20Implementation', function () {
  let token: ScoutTokenERC20TestFixture;
  let erc20AdminAccount: GeneratedWallet;
  let userAccount: GeneratedWallet;
  let secondUserAccount: GeneratedWallet;

  beforeEach(async () => {
    token = await loadScoutTokenERC20Fixtures();

    erc20AdminAccount = token.ScoutTokenERC20AdminAccount;
    ({ userAccount, secondUserAccount } = await generateWallets());
  });

  describe('transfer', function () {
    describe('effects', function () {
      it('transfers tokens correctly', async function () {
        // Mint tokens to admin

        const adminBalanceBeforeTransfer = await token.ScoutTokenERC20Implementation.read.balanceOf([
          erc20AdminAccount.account.address
        ]);

        const firstTransfer = BigInt(500);
        const secondTransfer = BigInt(700);

        const totalTransfer = firstTransfer + secondTransfer;

        // Transfer tokens from admin to user
        await token.ScoutTokenERC20Implementation.write.transfer([userAccount.account.address, firstTransfer], {
          account: erc20AdminAccount.account
        });

        await token.ScoutTokenERC20Implementation.write.transfer([userAccount.account.address, secondTransfer], {
          account: erc20AdminAccount.account
        });

        const userBalance = await token.ScoutTokenERC20Implementation.read.balanceOf([userAccount.account.address]);
        expect(userBalance).toEqual(totalTransfer);

        const adminBalance = await token.ScoutTokenERC20Implementation.read.balanceOf([erc20AdminAccount.account.address]);
        expect(adminBalance).toEqual(adminBalanceBeforeTransfer - totalTransfer);
      });
    });

    describe('events', function () {
      it('emits Transfer event on transfer', async function () {
        // Mint tokens to admin

        // Transfer tokens from admin to user
        const txResponse = await token.ScoutTokenERC20Implementation.write.transfer([userAccount.account.address, BigInt(500)], {
          account: erc20AdminAccount.account
        });

        const receipt = await erc20AdminAccount.getTransactionReceipt({ hash: txResponse });

        const transferEvent = parseEventLogs({
          abi: token.ScoutTokenERC20Implementation.abi,
          logs: receipt.logs,
          eventName: ['Transfer']
        })[0];

        expect(transferEvent).toBeDefined();
        expect(transferEvent.args.from).toEqual(erc20AdminAccount.account.address);
        expect(transferEvent.args.to).toEqual(userAccount.account.address);
        expect(transferEvent.args.value).toEqual(BigInt(500));
      });
    });

    describe('permissions', function () {
      it('allows token holders to transfer their tokens', async function () {
        await token.fundWallet({
          account: userAccount.account.address,
          amount: 1000
        });

        // Transfer tokens from user to second user
        await expect(
          token.ScoutTokenERC20Implementation.write.transfer(
            [secondUserAccount.account.address, BigInt(500) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER],
            {
              account: userAccount.account
            }
          )
        ).resolves.toBeDefined();

        const secondUserBalance = await token.ScoutTokenERC20Implementation.read.balanceOf([secondUserAccount.account.address]);
        expect(secondUserBalance).toEqual(BigInt(500) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER);
      });
    });

    describe('validations', function () {
      it('prevents transferring more tokens than balance', async function () {
        await token.fundWallet({
          account: secondUserAccount.account.address,
          amount: 1000
        });

        // User has zero balance
        await expect(
          token.ScoutTokenERC20Implementation.write.transfer(
            [secondUserAccount.account.address, BigInt(2000) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER],
            {
              account: userAccount.account
            }
          )
        ).rejects.toThrow('ERC20InsufficientBalance');
      });
    });
  });

  describe('approve', function () {
    describe('effects', function () {
      it('approves allowance correctly', async function () {
        await expect(
          token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(1000)], {
            account: userAccount.account
          })
        ).resolves.toBeDefined();

        const allowance = await token.ScoutTokenERC20Implementation.read.allowance([
          userAccount.account.address,
          secondUserAccount.account.address
        ]);
        expect(allowance).toEqual(BigInt(1000));
      });
    });

    describe('events', function () {
      it('emits Approval event on approve', async function () {
        const txResponse = await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(1000)], {
          account: userAccount.account
        });

        const receipt = await userAccount.getTransactionReceipt({ hash: txResponse });

        const approvalEvent = parseEventLogs({
          abi: token.ScoutTokenERC20Implementation.abi,
          logs: receipt.logs,
          eventName: ['Approval']
        })[0];

        expect(approvalEvent).toBeDefined();
        expect(approvalEvent.args.owner).toEqual(userAccount.account.address);
        expect(approvalEvent.args.spender).toEqual(secondUserAccount.account.address);
        expect(approvalEvent.args.value).toEqual(BigInt(1000));
      });
    });
  });

  describe('transferFrom', function () {
    describe('effects', function () {
      it('transfers tokens correctly using allowance', async function () {
        const thirdAccount = await walletFromKey();

        await token.fundWallet({
          account: userAccount.account.address,
          amount: 1000
        });

        // Approve second user
        await token.ScoutTokenERC20Implementation.write.approve(
          [secondUserAccount.account.address, BigInt(500) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER],
          {
            account: userAccount.account
          }
        );

        // Transfer from user to admin using second user's account
        await token.ScoutTokenERC20Implementation.write.transferFrom(
          [
            userAccount.account.address,
            thirdAccount.account.address,
            BigInt(500) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER
          ],
          { account: secondUserAccount.account }
        );

        const userBalance = await token.ScoutTokenERC20Implementation.read.balanceOf([userAccount.account.address]);
        expect(userBalance).toEqual(BigInt(500) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER);

        const recipientBalance = await token.ScoutTokenERC20Implementation.read.balanceOf([thirdAccount.account.address]);
        expect(recipientBalance).toEqual(BigInt(500) * token.ScoutTokenERC20_DECIMAL_MULTIPLIER);
      });
    });

    describe('events', function () {
      it('emits Transfer event on transferFrom', async function () {
        await token.fundWallet({
          account: userAccount.account.address,
          amount: 1000
        });

        // Approve second user
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        // Transfer from user to admin using second user's account
        const txResponse = await token.ScoutTokenERC20Implementation.write.transferFrom(
          [userAccount.account.address, erc20AdminAccount.account.address, BigInt(500)],
          { account: secondUserAccount.account }
        );

        const receipt = await secondUserAccount.getTransactionReceipt({ hash: txResponse });

        const transferEvent = parseEventLogs({
          abi: token.ScoutTokenERC20Implementation.abi,
          logs: receipt.logs,
          eventName: ['Transfer']
        })[0];

        expect(transferEvent).toBeDefined();
        expect(transferEvent.args.from).toEqual(userAccount.account.address);
        expect(transferEvent.args.to).toEqual(erc20AdminAccount.account.address);
        expect(transferEvent.args.value).toEqual(BigInt(500));
      });
    });

    describe('permissions', function () {
      it('allows spender to transfer within allowance', async function () {
        await token.fundWallet({
          account: userAccount.account.address,
          amount: 1000
        });

        // Approve second user
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        await expect(
          token.ScoutTokenERC20Implementation.write.transferFrom(
            [userAccount.account.address, erc20AdminAccount.account.address, BigInt(500)],
            { account: secondUserAccount.account }
          )
        ).resolves.toBeDefined();
      });

      it('prevents spender from transferring more than allowance', async function () {
        await token.fundWallet({
          account: userAccount.account.address,
          amount: 1000
        });

        // Approve second user
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        await expect(
          token.ScoutTokenERC20Implementation.write.transferFrom(
            [userAccount.account.address, erc20AdminAccount.account.address, BigInt(600)],
            { account: secondUserAccount.account }
          )
        ).rejects.toThrow('ERC20InsufficientAllowance');
      });

      it('prevents spender from transferring more than balance', async function () {
        // Approve second user
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        await expect(
          token.ScoutTokenERC20Implementation.write.transferFrom(
            [userAccount.account.address, erc20AdminAccount.account.address, BigInt(500)],
            { account: secondUserAccount.account }
          )
        ).rejects.toThrow('ERC20InsufficientBalance');
      });
    });
  });

  describe('increaseAllowance', function () {
    describe('effects', function () {
      it('increases allowance correctly', async function () {
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(1000)], {
          account: userAccount.account
        });

        await token.ScoutTokenERC20Implementation.write.increaseAllowance([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        const allowance = await token.ScoutTokenERC20Implementation.read.allowance([
          userAccount.account.address,
          secondUserAccount.account.address
        ]);
        expect(allowance).toEqual(BigInt(1500));
      });
    });

    describe('events', function () {
      it('emits Approval event on increaseAllowance', async function () {
        const txResponse = await token.ScoutTokenERC20Implementation.write.increaseAllowance(
          [secondUserAccount.account.address, BigInt(500)],
          { account: userAccount.account }
        );

        const receipt = await userAccount.getTransactionReceipt({ hash: txResponse });

        const approvalEvent = parseEventLogs({
          abi: token.ScoutTokenERC20Implementation.abi,
          logs: receipt.logs,
          eventName: ['Approval']
        })[0];

        expect(approvalEvent).toBeDefined();
        expect(approvalEvent.args.owner).toEqual(userAccount.account.address);
        expect(approvalEvent.args.spender).toEqual(secondUserAccount.account.address);
        expect(approvalEvent.args.value).toEqual(BigInt(500));
      });
    });
  });

  describe('decreaseAllowance', function () {
    describe('effects', function () {
      it('decreases allowance correctly', async function () {
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(1000)], {
          account: userAccount.account
        });

        await token.ScoutTokenERC20Implementation.write.decreaseAllowance([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        const allowance = await token.ScoutTokenERC20Implementation.read.allowance([
          userAccount.account.address,
          secondUserAccount.account.address
        ]);
        expect(allowance).toEqual(BigInt(500));
      });
    });

    describe('validations', function () {
      it('reverts when decreasing allowance below zero', async function () {
        await token.ScoutTokenERC20Implementation.write.approve([secondUserAccount.account.address, BigInt(500)], {
          account: userAccount.account
        });

        await expect(
          token.ScoutTokenERC20Implementation.write.decreaseAllowance([secondUserAccount.account.address, BigInt(600)], {
            account: userAccount.account
          })
        ).rejects.toThrow('ERC20: decreased allowance below zero');
      });
    });
  });
});
