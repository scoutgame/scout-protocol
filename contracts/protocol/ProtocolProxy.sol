// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./libs/MemoryUtils.sol";

contract ProtocolProxy {
    using MemoryUtils for bytes32;

  // Modifier to restrict access to admin functions
  modifier onlyAdmin() {
      require(MemoryUtils.isAdmin(msg.sender), "Proxy: caller is not the admin");
      _;
  }

  constructor(
        address _implementationAddress,
        address _claimsTokenAddress
    ) {
        require(_implementationAddress != address(0), "Invalid implementation address");
        require(_claimsTokenAddress != address(0), "Invalid payment token address");
        MemoryUtils.setAddress(MemoryUtils.ADMIN_SLOT, msg.sender);
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, _implementationAddress);
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

    function setClaimsToken(address _paymentToken) external onlyAdmin {
        require(_paymentToken != address(0), "Invalid payment token address");
        require(MemoryUtils.isContract(_paymentToken), "Payment token must be a contract");
        MemoryUtils.setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, _paymentToken);
    }

    function admin() public view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.ADMIN_SLOT);
    }

    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        MemoryUtils.setAddress(MemoryUtils.ADMIN_SLOT, _newAdmin);
    }

    fallback() external payable {
        address impl = implementation();
        require(impl != address(0), "Implementation contract not set");
        assembly {
            // Copy msg.data
            calldatacopy(0, 0, calldatasize())

            // Delegatecall to the implementation contract
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)

            // Copy returned data
            returndatacopy(0, 0, returndatasize())

            switch result
                case 0 { revert(0, returndatasize()) }
                default { return (0, returndatasize()) }
        }
    }
}