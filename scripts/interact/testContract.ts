import hre from 'hardhat';
import { Address, privateKeyToAccount } from 'viem/accounts';

const RESOLVER_ADDRESS = '0x3354B452e319E03de8eC4047cB56209304DFA645';
const RECIPIENT_ADDRESS = '0x66525057AC951a0DB5C9fa7fAC6E056D6b8997E2';

async function main() {
  const contract = await hre.viem.getContractAt('StargateProtocol', RESOLVER_ADDRESS);
  const result = await contract.read.getUnclaimedBalance([RECIPIENT_ADDRESS]);
  console.log(result.toString());
}


console.log(privateKeyToAccount(process.env.PRIVATE_KEY as Address));

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
