// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "../libs/ProtocolAccessControl.sol";

contract TestProtocolAccessControl is ProtocolAccessControl {

  constructor() {
    _setRole(MemoryUtils.ADMIN_SLOT, _msgSender());
  }

  function setRole(bytes32 role, address account) external {
    _setRole(role, account);
  }

  function roleHolder(bytes32 role) external view returns (address) {
    return _roleHolder(role);
  }
}