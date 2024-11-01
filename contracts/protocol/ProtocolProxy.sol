// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "./ProtocolAccessControl.sol";
import "./libs/MemoryUtils.sol";

contract ProtocolProxy is Context, ProtocolAccessControl {
  using MemoryUtils for bytes32;

  constructor(
        address _implementationAddress,
        address _claimsTokenAddress
    ) {
        require(_implementationAddress != address(0), "Invalid implementation address");
        require(_claimsTokenAddress != address(0), "Invalid payment token address");
        MemoryUtils.setAddress(MemoryUtils.ADMIN_SLOT, _msgSender());
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, _implementationAddress);
        MemoryUtils.setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, _claimsTokenAddress);
        MemoryUtils.setAddress(MemoryUtils.CLAIM_MANAGER_SLOT, _msgSender());
    }

    function implementation() public view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT);
    }

    function setImplementation(address _newImplementation) external onlyAdmin {
        require(_newImplementation != address(0), "Invalid implementation address");
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, _newImplementation);
    }

    function claimsToken() public view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.CLAIMS_TOKEN_SLOT);
    }

    function setClaimsToken(address _claimsToken) external onlyAdmin {
        require(_claimsToken != address(0), "Invalid payment token address");
        require(MemoryUtils.isContract(_claimsToken), "Payment token must be a contract");
        MemoryUtils.setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, _claimsToken);
    }

    fallback() external payable {
        address impl = MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT);
        require(impl != address(0), "Implementation not set");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
                case 0 { revert(0, returndatasize()) }
                default { return(0, returndatasize()) }
        }
    }
}