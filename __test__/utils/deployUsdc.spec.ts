import { deployTestUSDC, generateWallets } from "../testUtils";



describe('deployUsdc', () => {

  it('should deploy the USDC contract, with minting and transfers enabled', async () => {

    const { USDC, mintUSDCTo, transferUSDC, balanceOfUSDC, USDC_DECIMALS, USDC_DECIMALS_MULTIPLIER } = await deployTestUSDC();

    const {userAccount, secondUserAccount} = await generateWallets()
  
    const userBalance = await balanceOfUSDC({account: userAccount.account.address});
  
    expect(userBalance).toBe(0);

    const thousandUsdc = 1000;

    // Mint 1000 USDC to the user
    await mintUSDCTo({account: userAccount.account.address, amount: thousandUsdc});
  
    const newUserBalance = await balanceOfUSDC({account: userAccount.account.address});

    expect(newUserBalance).toBe(thousandUsdc);

    // // Test transfers

    // await 

    // await USDC.write.transfer([secondUserAccount.account.address, BigInt(100)], {account: userAccount.account});
  
  });
})