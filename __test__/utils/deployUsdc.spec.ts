import { deployTestUSDC, generateWallets } from "../testUtils";



describe('deployUsdc', () => {

  it('should deploy the USDC contract, with minting, approve, transfer and transferFrom enabled', async () => {

    const { USDC, mintUSDCTo, transferUSDC, balanceOfUSDC, approveUSDC, transferUSDCFrom, USDC_DECIMALS_MULTIPLIER } = await deployTestUSDC();

    const {userAccount, secondUserAccount} = await generateWallets()
  
    const userBalance = await balanceOfUSDC({account: userAccount.account.address});
  
    expect(userBalance).toBe(0);

    const thousandUsdc = 1000;
    const fiftyUsdc = 50;
    const hundredUsdc = 100;

    // Mint 1000 USDC to the user
    await mintUSDCTo({account: userAccount.account.address, amount: thousandUsdc});
  
    const newUserBalance = await balanceOfUSDC({account: userAccount.account.address});

    expect(newUserBalance).toBe(thousandUsdc);

    // Test transfers
    await transferUSDC({args: {to: secondUserAccount.account.address, amount: fiftyUsdc}, wallet: userAccount}); 

    const userBalanceAfterTransfer = await balanceOfUSDC({account: userAccount.account.address});
    const secondUserBalance = await balanceOfUSDC({account: secondUserAccount.account.address});

    expect(userBalanceAfterTransfer).toBe(thousandUsdc - fiftyUsdc);
    expect(secondUserBalance).toBe(fiftyUsdc);
 
    // Check transferFrom transfers
    // We need to call approve() first
    await approveUSDC({args: {spender: secondUserAccount.account.address, amount: hundredUsdc}, wallet: userAccount});

    // test the transferFrom function
    await transferUSDCFrom({args: {from: userAccount.account.address, to: secondUserAccount.account.address, amount: hundredUsdc}, wallet: secondUserAccount});

    const userBalanceAfterTransferFrom = await balanceOfUSDC({account: userAccount.account.address});
    const secondUserBalanceAfterTransferFrom = await balanceOfUSDC({account: secondUserAccount.account.address});

    expect(userBalanceAfterTransferFrom).toBe(thousandUsdc - (hundredUsdc + fiftyUsdc));
    expect(secondUserBalanceAfterTransferFrom).toBe(fiftyUsdc + hundredUsdc);
  });
})