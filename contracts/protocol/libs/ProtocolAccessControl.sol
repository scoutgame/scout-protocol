// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "./MemoryUtils.sol";

contract ProtocolAccessControl is Context {
    using MemoryUtils for bytes32;

    event RoleTransferred(string roleName, address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
      require(_isAdmin(), "Caller is not the admin");
      _;
    }

    function _hasRole(bytes32 role) internal view returns (bool) {
      address _account = _msgSender();
      return _account == _roleHolder(role);
    }

    function _setRole(bytes32 role, address account) internal {
      require(account != address(0), "Invalid account. Cannot be empty");

      address _currentHolder = _roleHolder(role);

      require(_currentHolder != account, "New role holder cannot be the same as the current holder");

      MemoryUtils._setAddress(role, account);
    }

    function _isAdmin() internal view returns (bool) {
      return _hasRole(MemoryUtils.ADMIN_SLOT);
    }

    function admin() public view returns (address) {
      return MemoryUtils._getAddress(MemoryUtils.ADMIN_SLOT);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
      address _previousAdmin = admin();

      _setRole(MemoryUtils.ADMIN_SLOT, _newAdmin);

      emit RoleTransferred("Admin", _previousAdmin, _newAdmin);
    }

    function _roleHolder(bytes32 role) internal view returns (address) {
      return MemoryUtils._getAddress(role);
    }
}