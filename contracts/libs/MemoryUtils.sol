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

    bytes32 internal constant TOKEN_NAME = keccak256("token.name");
    bytes32 internal constant TOKEN_SYMBOL = keccak256("token.name");

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

        // Getter and setter for string type using bytes32 slot
    function getString(bytes32 slot) internal view returns (string memory) {
        return _bytes32ToString(StorageSlot.getBytes32Slot(slot).value);
    }

    function setString(bytes32 slot, string memory value) internal {
        require(bytes(value).length <= 32, "String too long for slot");
        StorageSlot.getBytes32Slot(slot).value = _stringToBytes32(value);
    }

    // Helper function to convert string to bytes32
    function _stringToBytes32(string memory source) internal pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    // Helper function to convert bytes32 to string
    function _bytes32ToString(bytes32 source) internal pure returns (string memory) {
        bytes memory tempBytes = new bytes(32);
        for (uint256 i = 0; i < 32; i++) {
            tempBytes[i] = source[i];
        }
        return string(tempBytes);
    }

    // Function to check if an address is the admin
    function isAdmin(address caller) internal view returns (bool) {
        return caller == getAddress(ADMIN_SLOT);
    }
}
