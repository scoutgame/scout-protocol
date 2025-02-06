import { Tenderly } from '@tenderly/hardhat-tenderly';
import dotenv from 'dotenv';
import { task } from 'hardhat/config';

dotenv.config();

task('verifyViaTenderly', 'Deploys or updates the Scout Game ERC20 contract').setAction(async (taskArgs, hre) => {
  await hre.run('compile');

  // Follow these instructions to log into the Tenderly CLI
  // https://docs.tenderly.co/contract-verification/hardhat#log-into-tenderly-cli

  const tenderly = new Tenderly(hre);

  // await tenderly.verify([
  //   {
  //     name: 'LockupWeeklyStreamCreator',
  //     address: '0x8227c1bdcd7097f4aff2f9e448405c29263ec60b',
  //     constructorArguments: ['0x0b420076b8e3c9778179baaeb6c69a95904ad6fe', '0xb8c724df3eC8f2Bf8fA808dF2cB5dbab22f3E68c']
  //   }
  // ]);

  await tenderly.verify([
    {
      name: 'ScoutTokenERC20Proxy',
      address: '0x0B420076B8E3C9778179BaAEb6c69A95904aD6Fe',
      constructorArguments: ['0xcc5334aC646885B9F94BE9D076d4Be8C4a2e9b78', '0x93cc4a36D510B9D65325A795EE41201f9232fa4D']
      // constructorArguments: ['0x0b420076b8e3c9778179baaeb6c69a95904ad6fe', '0xb8c724df3eC8f2Bf8fA808dF2cB5dbab22f3E68c']
    }
  ]);
});

module.exports = {};
