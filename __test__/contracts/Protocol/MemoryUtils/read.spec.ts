import { viem } from 'hardhat';
import { keccak256, toBytes, toHex } from 'viem/utils';

async function deployTestMemoryUtils() {
  const testMemoryUtilsContract = await viem.deployContract('TestMemoryUtils', []);

  return {
    testMemoryUtilsContract
  };
}

describe('returns', function () {
  let testMemoryUtils: Awaited<ReturnType<typeof deployTestMemoryUtils>>['testMemoryUtilsContract'];

  beforeAll(async () => {
    testMemoryUtils = (await deployTestMemoryUtils()).testMemoryUtilsContract;
  });

  it('returns the correct IMPLEMENTATION_SLOT, compliant with EIP 1967', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('eip1967.proxy.implementation'))) - BigInt(1));
    const implementationSlot = await testMemoryUtils.read.getImplementationSlot();
    expect(implementationSlot).toEqual(expectedSlot);
  });

  it('returns the correct PROCEEDS_RECEIVER_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('builderNFT.proceedsReceiver'))));
    const claimsTokenSlot = await testMemoryUtils.read.getProceedsReceiverSlot();
    expect(claimsTokenSlot).toEqual(expectedSlot);
  });

  it('returns the correct CLAIMS_TOKEN_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.token'))));
    const claimsTokenSlot = await testMemoryUtils.read.getClaimsTokenSlot();
    expect(claimsTokenSlot).toEqual(expectedSlot);
  });

  it('returns the correct MINTER_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('builderNFT.minterRole'))));
    const claimsTokenSlot = await testMemoryUtils.read.getMinterSlot();
    expect(claimsTokenSlot).toEqual(expectedSlot);
  });

  it('returns the correct CLAIMS_HISTORY_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.claimsHistory'))));
    const claimsHistorySlot = await testMemoryUtils.read.getClaimsHistorySlot();
    expect(claimsHistorySlot).toEqual(expectedSlot);
  });

  it('returns the correct MERKLE_ROOTS_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.merkleRoots'))));
    const merkleRootsSlot = await testMemoryUtils.read.getMerkleRootsSlot();
    expect(merkleRootsSlot).toEqual(expectedSlot);
  });

  it('returns the correct ADMIN_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('common.admin'))));
    const adminSlot = await testMemoryUtils.read.getAdminSlot();
    expect(adminSlot).toEqual(expectedSlot);
  });

  it('returns the correct PAUSER_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('common.pauser'))));
    const pauserSlot = await testMemoryUtils.read.getPauserSlot();
    expect(pauserSlot).toEqual(expectedSlot);
  });

  it('returns the correct CLAIM_MANAGER_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.claimsManager'))));
    const claimManagerSlot = await testMemoryUtils.read.getClaimManagerSlot();
    expect(claimManagerSlot).toEqual(expectedSlot);
  });

  it('returns the correct EAS_ATTESTER_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('easResolver.attester'))));
    const easAttesterSlot = await testMemoryUtils.read.getEasAttesterSlot();
    expect(easAttesterSlot).toEqual(expectedSlot);
  });

  it('returns the correct SECONDARY_EAS_ATTESTER_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('easResolver.secondaryAttester'))));
    const secondaryEasAttesterSlot = await testMemoryUtils.read.getSecondaryEasAttesterSlot();
    expect(secondaryEasAttesterSlot).toEqual(expectedSlot);
  });

  it('returns the correct IS_PAUSED_SLOT', async function () {
    const expectedSlot = toHex(BigInt(keccak256(toBytes('common.isPaused'))));
    const isPausedSlot = await testMemoryUtils.read.getIsPausedSlot();
    expect(isPausedSlot).toEqual(expectedSlot);
  });
});
