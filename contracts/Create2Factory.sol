// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./StardustCoin.sol"; // Make sure the path is correct


contract Create2Factory {
    event Deployed(address addr, bytes32 salt);

    function deploy(bytes32 salt, bytes memory bytecode) public returns (address) {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
        emit Deployed(addr, salt);
        return addr;
    }

    function getAddress(bytes32 salt, bytes memory bytecode) public view returns (address) {
        return address(uint160(uint(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        )))));
    }

    function getBytecode(address owner, uint256 initialSupply) public pure returns (bytes memory) {
        bytes memory bytecode = type(StardustCoin).creationCode;
        return abi.encodePacked(bytecode, abi.encode(owner, initialSupply));
    }
}