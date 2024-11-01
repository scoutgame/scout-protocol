// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./ProtocolERC20Token.sol";
import "./libs/MemoryUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract ProtocolImplementation {
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

    // Function to get the Merkle root hash for a given week
    function getMerkleRoot(string memory week) external view returns (string memory) {
        bytes32 slot = keccak256(abi.encodePacked(week, MemoryUtils.MERKLE_ROOTS_SLOT));
        string memory merkleRoot;
        assembly {
            merkleRoot := sload(slot)
        }
        return merkleRoot;
    }

    // Function to set the Merkle root for a given week
    function setMerkleRoot(string memory week, string memory merkleRoot) internal {
        bytes32 slot = keccak256(abi.encodePacked(week, MemoryUtils.MERKLE_ROOTS_SLOT));
        StorageSlot.getStringSlot(slot).value = merkleRoot;
    }

    // Function to check if an address has claimed for a given week
    function hasClaimed(string memory week, address account) internal view returns (bool) {
        bytes32 slot = keccak256(abi.encodePacked(week, account, MemoryUtils.CLAIMS_HISTORY_SLOT));
        return StorageSlot.getBooleanSlot(slot).value;
    }

    // Function to set the claim status for an address for a given week
    function setClaimed(string memory week, address account) internal {
        bytes32 slot = keccak256(abi.encodePacked(week, account, MemoryUtils.CLAIMS_HISTORY_SLOT));
        StorageSlot.getBooleanSlot(slot).value = true;
    }

}