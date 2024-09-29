// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

library BuilderNFTSeasonOneMemory is Ownable {
    // Storage slot keys
    bytes32 public constant IMPLEMENTATION_SLOT = keccak256("builderNFT.implementation");
    bytes32 public constant PROCEEDS_RECEIVER_SLOT = keccak256("builderNFT.proceedsReceiver");
    bytes32 public constant PRICE_INCREMENT_SLOT = keccak256("builderNFT.priceIncrement");
    bytes32 public constant PAYMENT_ERC20_TOKEN_SLOT = keccak256("builderNFT.paymentERC20Token");
    bytes32 public constant NEXT_TOKEN_ID_SLOT = keccak256("builderNFT.nextTokenId");
    bytes32 public constant BASE_URL_SLOT = keccak256("builderNFT.baseUrl");
    bytes32 public constant SUFFIX_SLOT = keccak256("builderNFT.suffix");
    bytes32 public constant LOCK_STATUS_SLOT = keccak256("builderNFT.lockStatus");

    // constructor() Ownable(msg.sender) {}

    // Address type getter and setter
    function setAddress(bytes32 slot, address value) public onlyOwner {
        assembly {
            sstore(slot, value)
        }
    }

    function getAddress(bytes32 slot) public view returns (address value) {
        assembly {
            value := sload(slot)
        }
    }

    // Uint256 type getter and setter
    function setUint256(bytes32 slot, uint256 value) public onlyOwner {
        assembly {
            sstore(slot, value)
        }
    }

    function getUint256(bytes32 slot) public view returns (uint256 value) {
        assembly {
            value := sload(slot)
        }
    }

    // Boolean type getter and setter
    function setBool(bytes32 slot, bool value) public onlyOwner {
        assembly {
            sstore(slot, value)
        }
    }

    function getBool(bytes32 slot) public view returns (bool value) {
        assembly {
            value := sload(slot)
        }
    }

    // String type getter and setter
    function setString(bytes32 slot, string memory value) public onlyOwner {
        assembly {
            let length := mload(value) // Get string length
            sstore(slot, length) // Store length in the first slot
            let dataOffset := add(value, 0x20) // Data starts after the length (32 bytes)
            for { let i := 0 } lt(i, length) { i := add(i, 0x20) } {
                sstore(add(slot, add(1, div(i, 0x20))), mload(add(dataOffset, i))) // Store data in subsequent slots
            }
        }
    }

    function getString(bytes32 slot) public view returns (string memory) {
        string memory result;
        assembly {
            let length := sload(slot) // Get string length
            result := mload(0x40) // Load free memory pointer
            mstore(result, length) // Set the length
            let dataOffset := add(result, 0x20) // Data starts after length
            for { let i := 0 } lt(i, length) { i := add(i, 0x20) } {
                mstore(add(dataOffset, i), sload(add(slot, add(1, div(i, 0x20))))) // Retrieve data from storage
            }
            mstore(0x40, add(dataOffset, length)) // Update free memory pointer
        }
        return result;
    }
}