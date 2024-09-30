// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

library MemoryUtils {
    // Existing storage slots
    bytes32 internal constant IMPLEMENTATION_SLOT = keccak256("builderNFT.implementation");
    bytes32 internal constant PROCEEDS_RECEIVER_SLOT = keccak256("builderNFT.proceedsReceiver");
    bytes32 internal constant PRICE_INCREMENT_SLOT = keccak256("builderNFT.priceIncrement");
    bytes32 internal constant PAYMENT_ERC20_TOKEN_SLOT = keccak256("builderNFT.paymentERC20Token");
    bytes32 internal constant NEXT_TOKEN_ID_SLOT = keccak256("builderNFT.nextTokenId");
    bytes32 internal constant LOCK_STATUS_SLOT = keccak256("builderNFT.lockStatus");
    bytes32 internal constant ADMIN_SLOT = keccak256("builderNFT.admin");

    // New storage slots for added variables
    bytes32 internal constant BASE_URI_SLOT = keccak256("builderNFT.baseUri");
    bytes32 internal constant TOTAL_BUILDER_TOKENS_SLOT = keccak256("builderNFT.totalBuilderTokens");

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

    // Getter and setter for bytes32 type (used for strings)
    function getBytes32(bytes32 slot) internal view returns (bytes32) {
        return StorageSlot.getBytes32Slot(slot).value;
    }

    function setBytes32(bytes32 slot, bytes32 value) internal {
        StorageSlot.getBytes32Slot(slot).value = value;
    }

    // Function to check if an address is the admin
    function isAdmin(address caller) internal view returns (bool) {
        return caller == getAddress(ADMIN_SLOT);
    }
}
