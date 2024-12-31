// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "../ERC20/ScoutTokenERC20Implementation.sol";
import "../../libs/MemoryUtils.sol";
import "../../libs/ScoutProtocolAccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "../Vesting/LockupWeeklyStreamCreator.sol";

contract ScoutProtocolImplementation is Context, ScoutProtocolAccessControl {
    using MemoryUtils for bytes32;

    struct WeeklyMerkleRoot {
        string isoWeek;
        uint256 validUntil;
        bytes32 merkleRoot;
        string merkleTreeUri;
    }

    struct Claim {
        string week;
        uint256 amount;
        bytes32[] proofs;
    }

    event TokensClaimed(
        address indexed user,
        uint256 amount,
        string week,
        bytes32 indexed merkleRoot
    );

    modifier onlyAdminOrClaimManager() {
        require(
            _hasRole(MemoryUtils.CLAIM_MANAGER_SLOT) || _isAdmin(),
            "Proxy: caller is not the claim manager"
        );
        _;
    }

    constructor() {}

    function multiClaim(Claim[] calldata claims) public {
        for (uint256 i = 0; i < claims.length; i++) {
            claim(claims[i]);
        }
    }

    // Allow the sender to claim their balance as ERC20 tokens
    function claim(
        Claim calldata claimData
    ) public onlyWhenNotPaused returns (bool) {
        // Check if the user has already claimed for the given week
        require(
            !hasClaimed(claimData.week, _msgSender()),
            "You have already claimed for this week."
        );

        // Get the Merkle root for the given week
        WeeklyMerkleRoot memory weeklyMerkle = getWeeklyMerkleRoot(
            claimData.week
        );

        // Ensure the Merkle root is set
        require(
            weeklyMerkle.merkleRoot != bytes32(0),
            "Merkle root for this week is not set."
        );

        require(
            weeklyMerkle.validUntil > block.timestamp,
            "Claiming period expired"
        );

        // Construct the leaf node from the user's address and the amount
        bytes32 leaf = keccak256(
            abi.encodePacked(_msgSender(), claimData.amount)
        );

        // Verify the Merkle proof
        require(
            MerkleProof.verify(claimData.proofs, weeklyMerkle.merkleRoot, leaf),
            "Invalid Merkle proof."
        );

        // Mark the user as having claimed for this week
        setClaimed(claimData.week, _msgSender());

        // Ensure the contract has enough tokens to fulfill the claim
        uint256 contractBalance = _getToken().balanceOf(address(this));
        require(
            contractBalance >= claimData.amount,
            "Insufficient balance in contract."
        );

        ScoutTokenERC20Implementation token = _getToken();

        // Transfer tokens to the user
        token.transfer(_msgSender(), claimData.amount);

        emit TokensClaimed(
            _msgSender(),
            claimData.amount,
            claimData.week,
            weeklyMerkle.merkleRoot
        );

        return true;
    }

    // Function to get the full weekly merkle root data
    function getWeeklyMerkleRoot(
        string memory week
    ) public view returns (WeeklyMerkleRoot memory) {
        bytes32 slot = _getMerkleRootSlot(week);

        bytes memory data = StorageSlot.getBytesSlot(slot).value;
        require(data.length > 0, "No data for this week");

        return abi.decode(data, (WeeklyMerkleRoot));
    }

    // Function to set the Merkle root for a given week
    function setWeeklyMerkleRoot(
        WeeklyMerkleRoot calldata weeklyRoot
    ) external onlyAdminOrClaimManager onlyWhenNotPaused returns (bool) {
        require(bytes(weeklyRoot.isoWeek).length > 0, "Invalid ISO week");
        require(
            weeklyRoot.validUntil > block.timestamp,
            "Claiming period must be in the future"
        );
        require(weeklyRoot.merkleRoot != bytes32(0), "Invalid merkle root");
        require(
            bytes(weeklyRoot.merkleTreeUri).length > 0,
            "Invalid merkle tree URI"
        );

        bytes32 slot = _getMerkleRootSlot(weeklyRoot.isoWeek);

        // Pack the entire struct into bytes and store it
        MemoryUtils._setBytes(slot, abi.encode(weeklyRoot));

        return true;
    }

    // Function to check if an address has claimed for a given week
    function hasClaimed(
        string memory week,
        address account
    ) public view returns (bool) {
        bytes32 slot = userWeekClaimedSlot(week, account);
        return MemoryUtils._getBool(slot);
    }

    function userWeekClaimedSlot(
        string memory week,
        address account
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(MemoryUtils.CLAIMS_HISTORY_SLOT, week, account)
            );
    }

    // Function to set the claim status for an address for a given week
    function setClaimed(string memory week, address account) internal {
        bytes32 slot = userWeekClaimedSlot(week, account);

        MemoryUtils._setBool(slot, true);
    }

    // Function to get the ERC20 token instance
    function _getToken() internal view returns (ScoutTokenERC20Implementation) {
        address tokenAddress = MemoryUtils._getAddress(
            MemoryUtils.CLAIMS_TOKEN_SLOT
        );
        return ScoutTokenERC20Implementation(tokenAddress);
    }

    function claimsManager() public view returns (address) {
        return _roleHolder(MemoryUtils.CLAIM_MANAGER_SLOT);
    }

    function setClaimsManager(address account) external onlyAdmin {
        require(account != address(0), "Invalid address");
        _setRole(MemoryUtils.CLAIM_MANAGER_SLOT, account);
    }

    function acceptUpgrade() public view returns (address) {
        return address(this);
    }

    function scoutTokenERC20() public view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.CLAIMS_TOKEN_SLOT);
    }

    function setScoutTokenERC20(address token) external onlyAdmin {
        require(token != address(0), "Invalid token address");
        require(MemoryUtils._isContract(token), "Token is not a contract");
        MemoryUtils._setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, token);
    }

    function _getMerkleRootSlot(
        string memory week
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(MemoryUtils.WEEKLY_MERKLE_ROOTS_SLOT, week)
            );
    }
}
