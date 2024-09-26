// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BuilderUtils {
    // Validate if a string is a valid UUID
    function isValidUUID(string memory uuid) public pure returns (bool) {
        bytes memory uuidBytes = bytes(uuid);
        return uuidBytes.length == 36 &&
            uuidBytes[8] == "-" &&
            uuidBytes[13] == "-" &&
            uuidBytes[18] == "-" &&
            uuidBytes[23] == "-";
    }

    // Convert a uint256 to a string
    function uintToString(uint256 value) public pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}