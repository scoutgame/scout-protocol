import { viem } from 'hardhat';

async function deployUSDC() {
  // Step 1: Get Admin Wallet (this will be the admin for the USDC proxy)
  const [admin] = await viem.getWalletClients();

  // Step 2: Deploy required libraries
  const SignatureChecker = await viem.deployContract('SignatureChecker', undefined, {
    client: admin.account.client as any
  });

  const libraries = {
    'contracts/FiatTokenV2_2/contracts/util/SignatureChecker.sol:SignatureChecker': SignatureChecker.address,
  }

  // Step 2: Deploy the USDC Implementation Contract (FiatTokenV2_2)
  const USDCImplementation = await viem.deployContract('FiatTokenV2_2', undefined, {
    client: admin.account.client as any,
    libraries
  });

  console.log('USDC Implementation deployed at:', USDCImplementation.address);

  // Step 3: Deploy the USDC Proxy Contract (FiatTokenProxy)
  const USDCProxy = await viem.deployContract('FiatTokenProxy', [USDCImplementation.address], {
    client: admin.account.client as any
  });

  console.log('USDC Proxy deployed at:', USDCProxy.address);

  // Step 4: Initialize the USDC Proxy Contract with ABI
  const USDC = await viem.getContractAt('FiatTokenV2_2', USDCProxy.address, { client: { wallet: admin } }); // Proxy using Implementation ABI

  console.log('USDC Proxy initialized.');

  // Return the proxy with the implementation ABI attached
  return { USDC, USDCImplementation, USDCProxy, admin };
}

deployUSDC()
  .then(({ USDC }) => console.log('USDC deployment successful', USDC.address))
  .catch((err) => console.error('USDC deployment failed', err));