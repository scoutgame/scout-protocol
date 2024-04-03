// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Errors} from "./libraries/Errors.sol";
import "./libraries/Native.sol";
import "./libraries/Transfer.sol";
import {ERC20} from "solady/tokens/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Space.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SpaceRepository is
    Initializable,
    Native,
    AccessControlUpgradeable,
    Transfer,
    Errors
{
    Space[] public spaceArray;

    /// @notice This maps the profile ID to the profile details
    /// @dev Profile.id -> Profile
    mapping(bytes32 => Space) public spacesById;

    /// @notice Allo Owner Role for fund recovery
    bytes32 public constant CONTRACT_OWNER = keccak256("CONTRACT_OWNER");

    /// ====================================
    /// =========== Modifier ===============
    /// ====================================

    /// @notice Checks if the caller is the profile owner
    /// @dev Reverts `UNAUTHORIZED()` if the caller is not the profile owner
    /// @param _spaceId The ID of the profile
    modifier onlySpaceOwner(bytes32 _spaceId) {
        _checkOnlySpaceOwner(_spaceId);
        _;
    }

    // ====================================
    // =========== Initializer =============
    // ====================================

    /// @notice Initializes the contract after an upgrade
    /// @dev During upgrade -> a higher version should be passed to reinitializer. Reverts if the '_owner' is the 'address(0)'
    /// @param _owner The owner of the contract
    function initialize(address _owner) external reinitializer(1) {
        // Make sure the owner is not 'address(0)'
        if (_owner == address(0)) revert ZERO_ADDRESS();

        // Grant the role to the owner
        _grantRole(CONTRACT_OWNER, _owner);
    }

    /// ====================================
    /// ==== External/Public Functions =====
    /// ====================================

    function createNewSpace(string memory _name) public {
        Space space = new Space(_name);
        spaceArray.push(space);
    }

    /// ====================================
    /// ======== Internal Functions ========
    /// ====================================

    /// @notice Checks if the caller is the owner of the space
    /// @dev Internal function used by modifier 'onlySpaceOwner'
    /// @param _spaceId The ID of the space
    function _checkOnlySpaceOwner(bytes32 _spaceId) internal view {
        if (!_isOwnerOfSpace(_spaceId, msg.sender)) revert UNAUTHORIZED();
    }

    /// @notice Checks if an address is the owner of the space
    /// @dev Internal function used to determine if an address is the space owner
    /// @param _spaceId The 'spaceId' of the space
    /// @param _owner The address to check
    /// @return 'true' if the address is an owner of the space, otherwise 'false'
    function _isOwnerOfSpace(
        bytes32 _spaceId,
        address _owner
    ) internal view returns (bool) {
        return spacesById[_spaceId].owner == _owner;
    }a

    /// @notice Transfers any fund balance in Allo to the recipient
    /// @dev 'msg.sender' must be the Allo owner
    /// @param _token The address of the token to transfer
    /// @param _recipient The address of the recipient
    function recoverFunds(
        address _token,
        address _recipient
    ) external onlyRole(CONTRACT_OWNER) {
        if (_recipient == address(0)) revert ZERO_ADDRESS();

        uint256 amount = _token == NATIVE
            ? address(this).balance
            : ERC20(_token).balanceOf(address(this));
        _transferAmount(_token, _recipient, amount);
    }
}
