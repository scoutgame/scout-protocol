import dotenv from 'dotenv';

dotenv.config();

export const PRIVATE_KEY = (process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;


export const NULL_ADDRESS = '0x'