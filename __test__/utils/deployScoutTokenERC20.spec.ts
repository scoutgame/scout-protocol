import { deployScoutTokenERC20 } from '../deployScoutTokenERC20';
import type { ScoutTokenERC20TestFixture } from '../deployScoutTokenERC20';
import { generateWallets } from '../generateWallets';

describe('deployScoutTokenERC20', () => {
  let ScoutTokenERC20: ScoutTokenERC20TestFixture;

  beforeAll(async () => {
    ScoutTokenERC20 = await deployScoutTokenERC20();
  });

  it('should deploy the ScoutTokenERC20 contract, with minting, approve, transfer, balanceOf and transferFrom enabled, as well as a starting balance of 1 billion tokens for the admin, with balances preserved between upgrades', async () => {
    const {
      transferScoutTokenERC20,
      balanceOfScoutTokenERC20,
      approveScoutTokenERC20,
      transferScoutTokenERC20From,
      ScoutTokenERC20AdminAccount,
      ScoutTokenERC20Proxy
    } = ScoutTokenERC20;

    const { userAccount, secondUserAccount } = await generateWallets();

    const adminBalance = await balanceOfScoutTokenERC20({ account: ScoutTokenERC20AdminAccount.account.address });

    expect(adminBalance).toBe(1_000_000_000);

    const totalSupply = await ScoutTokenERC20.ScoutTokenERC20.read.totalSupply();

    const decimals = await ScoutTokenERC20.ScoutTokenERC20.read.decimals();

    expect(Number(totalSupply / 10n ** BigInt(decimals))).toBe(1_000_000_000);

    const userBalance = await balanceOfScoutTokenERC20({ account: userAccount.account.address });

    expect(userBalance).toBe(0);

    const thousandScoutTokenERC20 = 1000;
    const fiftyScoutTokenERC20 = 50;
    const hundredScoutTokenERC20 = 100;

    // Mint 1000 ScoutTokenERC20 to the user
    await transferScoutTokenERC20({
      args: { to: userAccount.account.address, amount: thousandScoutTokenERC20 },
      wallet: ScoutTokenERC20AdminAccount
    });

    const newUserBalance = await balanceOfScoutTokenERC20({ account: userAccount.account.address });

    expect(newUserBalance).toBe(thousandScoutTokenERC20);

    // Test transfers
    await transferScoutTokenERC20({
      args: { to: secondUserAccount.account.address, amount: fiftyScoutTokenERC20 },
      wallet: userAccount
    });

    const userBalanceAfterTransfer = await balanceOfScoutTokenERC20({ account: userAccount.account.address });
    const secondUserBalance = await balanceOfScoutTokenERC20({ account: secondUserAccount.account.address });

    expect(userBalanceAfterTransfer).toBe(thousandScoutTokenERC20 - fiftyScoutTokenERC20);
    expect(secondUserBalance).toBe(fiftyScoutTokenERC20);

    // Check transferFrom transfers
    // We need to call approve() first
    await approveScoutTokenERC20({
      args: { spender: secondUserAccount.account.address, amount: hundredScoutTokenERC20 },
      wallet: userAccount
    });

    // test the transferFrom function
    await transferScoutTokenERC20From({
      args: {
        from: userAccount.account.address,
        to: secondUserAccount.account.address,
        amount: hundredScoutTokenERC20
      },
      wallet: secondUserAccount
    });

    const userBalanceAfterTransferFrom = await balanceOfScoutTokenERC20({ account: userAccount.account.address });
    const secondUserBalanceAfterTransferFrom = await balanceOfScoutTokenERC20({
      account: secondUserAccount.account.address
    });

    expect(userBalanceAfterTransferFrom).toBe(
      thousandScoutTokenERC20 - (hundredScoutTokenERC20 + fiftyScoutTokenERC20)
    );
    expect(secondUserBalanceAfterTransferFrom).toBe(fiftyScoutTokenERC20 + hundredScoutTokenERC20);

    const { ScoutTokenERC20Implementation: newImplementation } = await deployScoutTokenERC20();

    await ScoutTokenERC20Proxy.write.setImplementation([newImplementation.address], {
      account: ScoutTokenERC20AdminAccount.account
    });

    // Verify all balances are maintained after upgrade
    const userBalanceAfterUpgrade = await balanceOfScoutTokenERC20({ account: userAccount.account.address });
    const secondUserBalanceAfterUpgrade = await balanceOfScoutTokenERC20({
      account: secondUserAccount.account.address
    });

    expect(userBalanceAfterUpgrade).toBe(thousandScoutTokenERC20 - (hundredScoutTokenERC20 + fiftyScoutTokenERC20));
    expect(secondUserBalanceAfterUpgrade).toBe(fiftyScoutTokenERC20 + hundredScoutTokenERC20);
  });
});
