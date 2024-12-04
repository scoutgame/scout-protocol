export function randomIntFromInterval({ min, max }: { min: number; max: number } = { min: 1, max: 1000 }) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomBigIntFromInterval({ min, max }: { min: number; max: number } = { min: 1, max: 1000 }) {
  return BigInt(randomIntFromInterval({ min, max }));
}
