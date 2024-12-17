// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "../libs/ScoutProtocolAccessControl.sol";
import "../libs/MemoryUtils.sol";

contract TestMemoryUtils {
    using MemoryUtils for bytes32;
    function getImplementationSlot() external pure returns (bytes32) {
        return MemoryUtils.IMPLEMENTATION_SLOT;
    }

    function getClaimsTokenSlot() external pure returns (bytes32) {
        return MemoryUtils.CLAIMS_TOKEN_SLOT;
    }

    function getClaimsHistorySlot() external pure returns (bytes32) {
        return MemoryUtils.CLAIMS_HISTORY_SLOT;
    }

    function getWeeklyMerkleRootsSlot() external pure returns (bytes32) {
        return MemoryUtils.WEEKLY_MERKLE_ROOTS_SLOT;
    }

    function getProceedsReceiverSlot() external pure returns (bytes32) {
        return MemoryUtils.PROCEEDS_RECEIVER_SLOT;
    }

    function getAdminSlot() external pure returns (bytes32) {
        return MemoryUtils.ADMIN_SLOT;
    }

    function getMinterSlot() external pure returns (bytes32) {
        return MemoryUtils.MINTER_SLOT;
    }

    function getPauserSlot() external pure returns (bytes32) {
        return MemoryUtils.PAUSER_SLOT;
    }

    function getClaimManagerSlot() external pure returns (bytes32) {
        return MemoryUtils.CLAIM_MANAGER_SLOT;
    }

    function getEasAttesterSlot() external pure returns (bytes32) {
        return MemoryUtils.EAS_ATTESTER_SLOT;
    }

    function getSecondaryEasAttesterSlot() external pure returns (bytes32) {
        return MemoryUtils.SECONDARY_EAS_ATTESTER_SLOT;
    }

    function getIsPausedSlot() external pure returns (bytes32) {
        return MemoryUtils.IS_PAUSED_SLOT;
    }
}
