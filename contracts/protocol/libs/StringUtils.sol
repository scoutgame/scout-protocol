// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library StringUtils {
    // Utility function to convert uint to string
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }

        uint256 temp = _i;
        uint256 digits;

        // Count the number of digits in the number
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        // Create a byte array to store the characters of the number
        bytes memory buffer = new bytes(digits);

        // Extract each digit from the least significant to the most significant
        while (_i != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_i % 10)));
            _i /= 10;
        }

        return string(buffer);
    }

    function _isValidUUID(string memory uuid) internal pure returns (bool) {
        bytes memory uuidBytes = bytes(uuid);
        return
            uuidBytes.length == 36 &&
            uuidBytes[8] == "-" &&
            uuidBytes[13] == "-" &&
            uuidBytes[18] == "-" &&
            uuidBytes[23] == "-";
    }
}
