// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

library MemoryUtils {
    // Common shared storage slots

    // 1. Contract
    bytes32 internal constant IMPLEMENTATION_SLOT = keccak256("Proxy.implementation");

    // 2. Claims
    bytes32 internal constant CLAIMS_TOKEN_SLOT = keccak256("Protocol.token");
    bytes32 internal constant CLAIMS_HISTORY_SLOT = keccak256("Protocol.claimsHistory");
    bytes32 internal constant MERKLE_ROOTS_SLOT = keccak256("Protocol.merkleRoots");

    // 3. Roles
    bytes32 internal constant ADMIN_SLOT = keccak256("Protocol.admin");
    bytes32 internal constant CLAIM_MANAGER_SLOT = keccak256("Protocol.claimsManager");

    function isAdmin(address account) internal view returns (bool) {
      return account == StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    function hasRole(bytes32 role, address account) internal view returns (bool) {
      return account == StorageSlot.getAddressSlot(role).value;
    }

    function isContract(address account) internal view returns (bool) {
      return account.code.length > 0;
    }

    // Getter and setter for address type
    function getAddress(bytes32 slot) internal view returns (address) {
      return StorageSlot.getAddressSlot(slot).value;
    }

    function setAddress(bytes32 slot, address value) internal {
      StorageSlot.getAddressSlot(slot).value = value;
    }

    // Getter and setter for uint256 type
    function getUint256(bytes32 slot) internal view returns (uint256) {
      return StorageSlot.getUint256Slot(slot).value;
    }

    function setUint256(bytes32 slot, uint256 value) internal {
      StorageSlot.getUint256Slot(slot).value = value;
    }

    // Getter and setter for boolean type
    function getBool(bytes32 slot) internal view returns (bool) {
      return StorageSlot.getBooleanSlot(slot).value;
    }

    function setBool(bytes32 slot, bool value) internal {
      StorageSlot.getBooleanSlot(slot).value = value;
    }

    // Functions to handle mappings
    function getUint256FromMapping(bytes32 mappingSlot, address key) internal view returns (uint256) {
      bytes32 slot = keccak256(abi.encode(key, mappingSlot));
      return StorageSlot.getUint256Slot(slot).value;
    }

    function setUint256InMapping(bytes32 mappingSlot, address key, uint256 value) internal {
      bytes32 slot = keccak256(abi.encode(key, mappingSlot));
      StorageSlot.getUint256Slot(slot).value = value;
    }
}