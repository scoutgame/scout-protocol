import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

// addresses https://github.com/ethereum-attestation-service/eas-contracts
const sepoliaEAS = '0x4200000000000000000000000000000000000021';
const sepoliaContract = '0x5f3731d33139f88a45564ee1b5cd379d3b0aa947';
// const opEAS = '0x4200000000000000000000000000000000000021';

const StargateModule = buildModule('StargateModule', (m) => {
  const easContract = m.getParameter('easContract', sepoliaEAS);
  const tokenContract = m.getParameter('tokenContract', sepoliaContract);

  const resolver = m.contract('StargateProtocol', [easContract, tokenContract]);

  return { resolver };
});

export default StargateModule;
