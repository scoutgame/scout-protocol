// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "./libs/MemoryUtils.sol";

contract ProtocolAccessControl is Context {
    using MemoryUtils for bytes32;

    modifier onlyAdmin() {
        require(MemoryUtils.isAdmin(_msgSender()), "Proxy: caller is not the admin");
        _;
    }

    modifier onlyAdminOrClaimManager() {
        require(MemoryUtils.isAdmin(_msgSender()) || MemoryUtils.hasRole(MemoryUtils.CLAIM_MANAGER_SLOT, _msgSender()), "Proxy: caller is not the claim manager");
        _;
    }

    function admin() public view returns (address) {
      return MemoryUtils.getAddress(MemoryUtils.ADMIN_SLOT);
    }

    function setAdmin(address _newAdmin) external onlyAdmin {
      require(_newAdmin != address(0), "Invalid admin address");
      MemoryUtils.setAddress(MemoryUtils.ADMIN_SLOT, _newAdmin);
    }

    function claimsManager() public view returns (address) {
      return MemoryUtils.getAddress(MemoryUtils.CLAIM_MANAGER_SLOT);
    }

    function setClaimsManager(address account) public onlyAdmin {
      require(account != address(0), "Invalid address");
      MemoryUtils.setAddress(MemoryUtils.CLAIM_MANAGER_SLOT, account);
    }
}