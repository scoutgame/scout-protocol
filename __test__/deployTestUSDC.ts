import { viem } from 'hardhat';
import { Address } from 'viem';
import { GeneratedWallet, generateWallets } from './generateWallets';




export async function deployTestUSDC({minterWallet}: {minterWallet?: GeneratedWallet } = {}) {
  // Step 1: Get Admin Wallet (this will be the admin for the USDC proxy)
  const {adminAccount, userAccount: fallbackMinter, secondUserAccount} = await generateWallets();

  const minter = minterWallet || fallbackMinter;

  // Step 2: Deploy required libraries
  const SignatureChecker = await viem.deployContract('SignatureChecker', undefined, {
    client: {wallet: adminAccount}
  });

  const libraries = {
    'contracts/FiatTokenV2_2/contracts/util/SignatureChecker.sol:SignatureChecker': SignatureChecker.address,
  }

  // Step 3: Deploy the USDC Implementation Contract (FiatTokenV2_2)
  const USDCImplementation = await viem.deployContract('FiatTokenV2_2', undefined, {
    client: {wallet: adminAccount},
    libraries
  });

  const USDC_DECIMALS = 6;


  // Step 4: Deploy the USDC Proxy Contract (FiatTokenProxy)
  const USDCProxy = await viem.deployContract('FiatTokenProxy', [USDCImplementation.address], {
    client: {wallet: adminAccount}
  });


  // Step 5: Initialize the USDC Proxy Contract with Implementation ABI
  const USDC = await viem.getContractAt('FiatTokenV2_2', USDCProxy.address, { client: { wallet: adminAccount } }); // Proxy using Implementation ABI

  // contracts/FiatTokenV2_2/contracts/v1/FiatTokenV1.sol #L69 function initialize()
  await USDC.write.initialize([
    // string memory tokenName
    'USD Coin',
    // string memory tokenSymbol
    'USDC',
    // string memory tokenCurrency
    'USD',
    // uint8 tokenUSDC_DECIMALS
    USDC_DECIMALS,
    // address newMasterMinter
    minter.account.address,
    // address newPauser
    adminAccount.account.address,
    // address newBlacklister,
    adminAccount.account.address,
    // address newOwner
    minter.account.address
  ], {account: minter.account});

  // Minter can issue up to 1 Trillion USDC  (1e12 * 1e6 USDC_DECIMALS)
  const minterAllowance =  BigInt(1e12) * BigInt(USDC_DECIMALS);

  await USDC.write.configureMinter([minter.account.address, minterAllowance], {account: minter.account});

  const USDC_DECIMALS_MULTIPLIER = BigInt(10) ** BigInt(USDC_DECIMALS);

  async function mintTo({account, amount}: {account: string, amount: number}) {
    await USDC.write.mint([account as Address, BigInt(amount) * USDC_DECIMALS_MULTIPLIER], {account: minter.account});
  }

  async function transfer({args: {to, amount}, wallet}: {args: {to: Address, amount: number}, wallet: GeneratedWallet}) {
    await USDC.write.transfer([to, BigInt(amount) * USDC_DECIMALS_MULTIPLIER], {account: wallet.account});
  }

  async function balanceOf({account}: {account: Address}) {
    const balance = (await USDC.read.balanceOf([account], {account: secondUserAccount.account}));

    return Number(balance / USDC_DECIMALS_MULTIPLIER);
  }

  async function approve({args: {spender, amount}, wallet}: {args: {spender: Address, amount: number}, wallet: GeneratedWallet}) {
    await USDC.write.approve([spender, BigInt(amount) * USDC_DECIMALS_MULTIPLIER], {account: wallet.account});
  }

  async function transferFrom({args: {from, to, amount}, wallet}: {args: {from: Address, to: Address, amount: number}, wallet: GeneratedWallet}) {
    await USDC.write.transferFrom([from, to, BigInt(amount) * USDC_DECIMALS_MULTIPLIER], {account: wallet.account});
  }

  // Return the proxy with the implementation ABI attached
  return { USDC, USDCImplementation, USDCProxy, USDCAdminAccount: adminAccount, USDCMinterAccount: minter, USDC_DECIMALS, USDC_DECIMALS_MULTIPLIER, mintUSDCTo: mintTo, transferUSDC: transfer, balanceOfUSDC: balanceOf, approveUSDC: approve, transferUSDCFrom: transferFrom };
}


export type USDCTestFixture = Awaited<ReturnType<typeof deployTestUSDC>>;