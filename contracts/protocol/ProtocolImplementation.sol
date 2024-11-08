// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./ScoutTokenERC20.sol";
import "./libs/MemoryUtils.sol";
import "./libs/ProtocolAccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract ScoutProtocolImplementation is Context, ProtocolAccessControl {
    using MemoryUtils for bytes32;


    modifier onlyAdminOrClaimManager() {
      require(_hasRole(MemoryUtils.CLAIM_MANAGER_SLOT) || _isAdmin() , "Proxy: caller is not the claim manager");
        _;
    }

    // Allow the sender to claim their balance as ERC20 tokens
    function claim(
        string memory week,
        uint256 amount,
        bytes32[] calldata proofs
    ) public returns (bool) {
        // Check if the user has already claimed for the given week
        require(!hasClaimed(week, msg.sender), "You have already claimed for this week.");

        // Get the Merkle root for the given week
        bytes32 merkleRoot = getMerkleRoot(week);

        // Ensure the Merkle root is set
        require(merkleRoot != bytes32(0), "Merkle root for this week is not set.");

        // Construct the leaf node from the user's address and the amount
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));

        // Verify the Merkle proof
        require(MerkleProof.verify(proofs, merkleRoot, leaf), "Invalid Merkle proof.");

        // Mark the user as having claimed for this week
        setClaimed(week, msg.sender);

        // Ensure the contract has enough tokens to fulfill the claim
        uint256 contractBalance = _getToken().balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient balance in contract.");

        ScoutTokenERC20 token = _getToken();

        // Transfer tokens to the user
        token.transfer(msg.sender, amount * (10 ** token.decimals()));

        return true;
    }

    // Function to get the Merkle root hash for a given week
    function getMerkleRoot(string memory week) public view returns (bytes32) {
        bytes32 slot = keccak256(abi.encodePacked(week, MemoryUtils.MERKLE_ROOTS_SLOT));

        bytes32 _merkleRootForWeek = StorageSlot.getBytes32Slot(slot).value;

        require(_merkleRootForWeek != bytes32(0), "Merkle root for this week is not set.");

        return _merkleRootForWeek;
    }

    // Function to set the Merkle root for a given week
    function setMerkleRoot(string memory week, bytes32 merkleRoot) external onlyAdminOrClaimManager {
        bytes32 slot = keccak256(abi.encodePacked(week, MemoryUtils.MERKLE_ROOTS_SLOT));
        StorageSlot.getBytes32Slot(slot).value = merkleRoot;
    }

    // Function to check if an address has claimed for a given week
    function hasClaimed(string memory week, address account) public view returns (bool) {
        bytes32 slot = keccak256(abi.encodePacked(week, account, MemoryUtils.CLAIMS_HISTORY_SLOT));
        return StorageSlot.getBooleanSlot(slot).value;
    }

    // Function to set the claim status for an address for a given week
    function setClaimed(string memory week, address account) internal {
        bytes32 slot = keccak256(abi.encodePacked(week, account, MemoryUtils.CLAIMS_HISTORY_SLOT));
        StorageSlot.getBooleanSlot(slot).value = true;
    }

    // Function to get the ERC20 token instance
    function _getToken() internal view returns (ScoutTokenERC20) {
        address tokenAddress = MemoryUtils._getAddress(MemoryUtils.CLAIMS_TOKEN_SLOT);
        return ScoutTokenERC20(tokenAddress);
    }

    function claimsManager() public view returns (address) {
      return _roleHolder(MemoryUtils.CLAIM_MANAGER_SLOT);
    }

    function setClaimsManager(address account) external onlyAdmin {
      require(account != address(0), "Invalid address");
      _setRole(MemoryUtils.CLAIM_MANAGER_SLOT, account);
    }
}