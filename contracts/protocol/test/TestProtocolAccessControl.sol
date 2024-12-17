// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "../libs/ScoutProtocolAccessControl.sol";

contract TestProtocolAccessControl is ScoutProtocolAccessControl {
    constructor() {
        _setRole(MemoryUtils.ADMIN_SLOT, _msgSender());
    }

    function setRole(bytes32 role, address account) external {
        _setRole(role, account);
    }

    function roleHolder(bytes32 role) external view returns (address) {
        return _roleHolder(role);
    }

    function testPaused() external view onlyWhenNotPaused returns (bool) {
        return true;
    }

    function testAdminStorageSlot(
        bytes32 slot
    ) external view returns (bytes32) {
        return MemoryUtils.ADMIN_SLOT;
    }
}
