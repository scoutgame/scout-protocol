// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./ScoutGameERC20Token.sol";
import "./libs/MemoryUtils.sol";

/// @title ScoutGameProtocol
/// @notice A schema resolver that manages unclaimed balances based on EAS attestations.
contract ScoutGameProtocolImplementation {
    using MemoryUtils for bytes32;

    // Modifier to restrict access to admin functions
    modifier onlyAdmin() {
        require(MemoryUtils.isAdmin(msg.sender), "Proxy: caller is not the admin");
        _;
    }

    // Allow the sender to claim their balance as ERC20 tokens
    function claim(uint256 amount, bytes32[] calldata proofs) public returns (bool) {
        // uint256 unclaimedBalance = MemoryUtils.getUint256FromMapping(MemoryUtils.UNCLAIMED_BALANCES_SLOT, msg.sender);
        // require(unclaimedBalance >= amount, "Insufficient unclaimed balance");

        // uint256 contractHolding = _getToken().balanceOf(address(this));
        // require(contractHolding >= amount, "Insufficient balance in contract");

        // // Decrease unclaimed balance
        // MemoryUtils.setUint256InMapping(MemoryUtils.UNCLAIMED_BALANCES_SLOT, msg.sender, unclaimedBalance - amount);

        // // Transfer tokens
        // _getToken().transfer(msg.sender, amount);
        // return true;
    }

       // Function to set a Merkle root hash for a given week
    function setMerkleRoot(string memory week, string memory merkleRoot) external onlyAdmin {
        bytes32 slot = keccak256(abi.encodePacked(week, MemoryUtils.MERKLE_ROOTS_SLOT));  
        assembly {
            sstore(slot, merkleRoot)
        }
    }

    // Function to get the Merkle root hash for a given week
    function getMerkleRoot(string memory week) external view returns (string memory) {
        bytes32 slot = keccak256(abi.encodePacked(week, MemoryUtils.MERKLE_ROOTS_SLOT));
        string memory merkleRoot;
        assembly {
            merkleRoot := sload(slot)
        }
        return merkleRoot;
    }

}