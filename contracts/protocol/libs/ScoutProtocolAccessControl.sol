// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "./MemoryUtils.sol";

contract ScoutProtocolAccessControl is Context {
    using MemoryUtils for bytes32;

    event RoleTransferred(
        string roleName,
        address indexed previousHolder,
        address indexed newHolder
    );

    // ERC-3643 https://docs.erc3643.org/erc-3643/smart-contracts-library/permissioned-tokens/tokens-interface
    event Paused(address _callerAddress);

    event Unpaused(address _callerAddress);

    modifier onlyAdmin() {
        require(_isAdmin(), "Caller is not the admin");
        _;
    }

    modifier onlyPauserOrAdmin() {
        require(
            _hasRole(MemoryUtils.PAUSER_SLOT) || _isAdmin(),
            "Caller is not the pauser or admin"
        );
        _;
    }

    modifier onlyWhenNotPaused() {
        require(!isPaused(), "Contract is paused");
        _;
    }

    // External functions ----------
    function admin() public view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.ADMIN_SLOT);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        _setRole(MemoryUtils.ADMIN_SLOT, _newAdmin);
    }

    function pause() external onlyPauserOrAdmin {
        require(isPaused() == false, "Contract is already paused");
        MemoryUtils._setBool(MemoryUtils.IS_PAUSED_SLOT, true);
        emit Paused(_msgSender());
    }

    function unPause() external onlyAdmin {
        require(isPaused() == true, "Contract is not paused");
        MemoryUtils._setBool(MemoryUtils.IS_PAUSED_SLOT, false);
        emit Unpaused(_msgSender());
    }

    function isPaused() public view returns (bool) {
        return MemoryUtils._getBool(MemoryUtils.IS_PAUSED_SLOT);
    }

    function pauser() public view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.PAUSER_SLOT);
    }

    function setPauser(address _newPauser) external onlyAdmin {
        _setRole(MemoryUtils.PAUSER_SLOT, _newPauser);
    }

    // Internal functions ----------
    function _hasRole(bytes32 role) internal view returns (bool) {
        address _account = _msgSender();
        return _account == _roleHolder(role);
    }

    function _setRole(bytes32 role, address account) internal {
        require(account != address(0), "Invalid account. Cannot be empty");

        address _currentHolder = _roleHolder(role);

        // Update the role only if it's different
        if (_currentHolder != account) {
            MemoryUtils._setAddress(role, account);
            emit RoleTransferred(
                MemoryUtils._getRoleName(role),
                _currentHolder,
                account
            );
        }
    }

    function _isAdmin() internal view returns (bool) {
        return _hasRole(MemoryUtils.ADMIN_SLOT);
    }

    function _roleHolder(bytes32 role) internal view returns (address) {
        return MemoryUtils._getAddress(role);
    }
}
