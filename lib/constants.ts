import dotenv from 'dotenv';

dotenv.config();

export const PRIVATE_KEY = (
  process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`
) as `0x${string}`;

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

// From foundry docs https://book.getfoundry.sh/tutorials/create2-tutorial#introduction
export const DETERMINISTIC_DEPLOYER_CONTRACT = '0x4e59b44847b379578588920ca78fbf26c0b4956c';
