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

  it('should generate a different set of addresses each time it is called', async () => {
    const { adminAccount, secondUserAccount, thirdUserAccount, userAccount } = await generateWallets();

    const {
      adminAccount: adminAccount2,
      secondUserAccount: secondUserAccount2,
      thirdUserAccount: thirdUserAccount2,
      userAccount: userAccount2
    } = await generateWallets();

    const allAddresses = [
      adminAccount.account.address,
      secondUserAccount.account.address,
      thirdUserAccount.account.address,
      userAccount.account.address,
      adminAccount2.account.address,
      secondUserAccount2.account.address,
      thirdUserAccount2.account.address,
      userAccount2.account.address
    ];

    // Simple sanity check
    expect(adminAccount2.account.address).not.toBe(adminAccount.account.address);

    // Check that all addresses are unique
    expect(new Set(allAddresses).size).toBe(allAddresses.length);
  });
});
