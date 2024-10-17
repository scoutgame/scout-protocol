import { generateWallets } from '../generateWallets';

describe('generateWallets', () => {
  it('should generate an admin wallet and 3 user wallets', async () => {
    const { adminAccount, secondUserAccount, thirdUserAccount, userAccount } = await generateWallets();

    expect(adminAccount).toBeDefined();
    expect(secondUserAccount).toBeDefined();
    expect(thirdUserAccount).toBeDefined();
    expect(userAccount).toBeDefined();

    const allAddresses = [
      adminAccount.account.address,
      secondUserAccount.account.address,
      thirdUserAccount.account.address,
      userAccount.account.address
    ];

    // Check that all addresses are unique
    expect(new Set(allAddresses).size).toBe(allAddresses.length);
  });
});
