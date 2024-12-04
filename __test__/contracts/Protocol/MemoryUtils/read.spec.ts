import { viem } from 'hardhat';
import { keccak256, toBytes, toHex } from 'viem/utils';

async function deployTestMemoryUtils() {
  const testMemoryUtilsContract = await viem.deployContract('TestMemoryUtils', []);

  return {
    testMemoryUtilsContract
  };
}

describe('MemoryUtils', function () {
  let testMemoryUtils: Awaited<ReturnType<typeof deployTestMemoryUtils>>['testMemoryUtilsContract'];

  beforeAll(async () => {
    testMemoryUtils = (await deployTestMemoryUtils()).testMemoryUtilsContract;
  });

  describe('IMPLEMENTATION_SLOT', function () {
    describe('returns', function () {
      it('the correct value, compliant with EIP 1967', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('eip1967.proxy.implementation'))) - BigInt(1));
        const implementationSlot = await testMemoryUtils.read.getImplementationSlot();
        expect(implementationSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('PROCEEDS_RECEIVER_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('builderNFT.proceedsReceiver'))));
        const proceedsReceiverSlot = await testMemoryUtils.read.getProceedsReceiverSlot();
        expect(proceedsReceiverSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('CLAIMS_TOKEN_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.token'))));
        const claimsTokenSlot = await testMemoryUtils.read.getClaimsTokenSlot();
        expect(claimsTokenSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('MINTER_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('builderNFT.minterRole'))));
        const minterSlot = await testMemoryUtils.read.getMinterSlot();
        expect(minterSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('CLAIMS_HISTORY_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.claimsHistory'))));
        const claimsHistorySlot = await testMemoryUtils.read.getClaimsHistorySlot();
        expect(claimsHistorySlot).toEqual(expectedSlot);
      });
    });
  });

  describe('WEEKLY_MERKLE_ROOTS_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.weeklyMerkleRoots'))));
        const merkleRootsSlot = await testMemoryUtils.read.getWeeklyMerkleRootsSlot();
        expect(merkleRootsSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('ADMIN_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('common.admin'))));
        const adminSlot = await testMemoryUtils.read.getAdminSlot();
        expect(adminSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('PAUSER_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('common.pauser'))));
        const pauserSlot = await testMemoryUtils.read.getPauserSlot();
        expect(pauserSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('CLAIM_MANAGER_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('protocol.claimsManager'))));
        const claimManagerSlot = await testMemoryUtils.read.getClaimManagerSlot();
        expect(claimManagerSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('EAS_ATTESTER_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('easResolver.attester'))));
        const easAttesterSlot = await testMemoryUtils.read.getEasAttesterSlot();
        expect(easAttesterSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('SECONDARY_EAS_ATTESTER_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('easResolver.secondaryAttester'))));
        const secondaryEasAttesterSlot = await testMemoryUtils.read.getSecondaryEasAttesterSlot();
        expect(secondaryEasAttesterSlot).toEqual(expectedSlot);
      });
    });
  });

  describe('IS_PAUSED_SLOT', function () {
    describe('returns', function () {
      it('the correct value', async function () {
        const expectedSlot = toHex(BigInt(keccak256(toBytes('common.isPaused'))));
        const isPausedSlot = await testMemoryUtils.read.getIsPausedSlot();
        expect(isPausedSlot).toEqual(expectedSlot);
      });
    });
  });
});
