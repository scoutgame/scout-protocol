// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

library MemoryUtils {
    // Common shared storage slots

    // 1. Contract implementation slot following EIP-1967
    bytes32 internal constant IMPLEMENTATION_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    // 2. Claims
    bytes32 internal constant CLAIMS_TOKEN_SLOT = keccak256("protocol.token");
    bytes32 internal constant CLAIMS_HISTORY_SLOT =
        keccak256("protocol.claimsHistory");
    bytes32 internal constant MERKLE_ROOTS_SLOT =
        keccak256("protocol.merkleRoots");

    bytes32 internal constant SABLIER_LOCKUP_SLOT =
        keccak256("protocol.sablierLockup");
    bytes32 internal constant SABLIER_LOCKUP_STREAMID_SLOT =
        keccak256("protocol.sablierLockupStreamId");

    // 3. Roles
    bytes32 internal constant ADMIN_SLOT = keccak256("common.admin");
    bytes32 internal constant PAUSER_SLOT = keccak256("common.pauser");

    bytes32 internal constant CLAIM_MANAGER_SLOT =
        keccak256("protocol.claimsManager");

    bytes32 internal constant EAS_ATTESTER_SLOT =
        keccak256("easResolver.attester");
    bytes32 internal constant SECONDARY_EAS_ATTESTER_SLOT =
        keccak256("easResolver.secondaryAttester");

    bytes32 internal constant PROCEEDS_RECEIVER_SLOT =
        keccak256("builderNFT.proceedsReceiver");

    bytes32 internal constant MINTER_SLOT = keccak256("builderNFT.minterRole");

    // 4. State
    bytes32 internal constant IS_PAUSED_SLOT = keccak256("common.isPaused");

    bytes32 internal constant PRICE_INCREMENT_SLOT =
        keccak256("builderNFT.priceIncrement");
    bytes32 internal constant TOKEN_NAME = keccak256("builderNFT.tokenName");
    bytes32 internal constant TOKEN_SYMBOL =
        keccak256("builderNFT.tokenSymbol");

    function _getRoleName(bytes32 role) internal pure returns (string memory) {
        if (role == ADMIN_SLOT) {
            return "Admin";
        } else if (role == CLAIM_MANAGER_SLOT) {
            return "Claim Manager";
        } else if (role == EAS_ATTESTER_SLOT) {
            return "EAS Attester";
        } else if (role == SECONDARY_EAS_ATTESTER_SLOT) {
            return "Secondary EAS Attester";
        } else if (role == PAUSER_SLOT) {
            return "Pauser";
        } else if (role == MINTER_SLOT) {
            return "Minter";
        } else {
            return "Unknown Role";
        }
    }

    // Internal functions ----------
    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    // Getter and setter for address type
    function _getAddress(bytes32 slot) internal view returns (address) {
        return StorageSlot.getAddressSlot(slot).value;
    }

    function _setAddress(bytes32 slot, address value) internal {
        StorageSlot.getAddressSlot(slot).value = value;
    }

    // Getter and setter for uint256 type
    function _getUint256(bytes32 slot) internal view returns (uint256) {
        return StorageSlot.getUint256Slot(slot).value;
    }

    function _setUint256(bytes32 slot, uint256 value) internal {
        StorageSlot.getUint256Slot(slot).value = value;
    }

    // Getter and setter for boolean type
    function _getBool(bytes32 slot) internal view returns (bool) {
        return StorageSlot.getBooleanSlot(slot).value;
    }

    function _setBool(bytes32 slot, bool value) internal {
        StorageSlot.getBooleanSlot(slot).value = value;
    }

    // Getter and setter for string type
    function _getString(bytes32 slot) internal view returns (string memory) {
        return StorageSlot.getStringSlot(slot).value;
    }

    function _setString(bytes32 slot, string memory value) internal {
        StorageSlot.getStringSlot(slot).value = value;
    }
}
