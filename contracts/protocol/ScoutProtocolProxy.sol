// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Context.sol";
import "./libs/ProtocolAccessControl.sol";
import "./libs/MemoryUtils.sol";

interface IImplementation {
    function acceptUpgrade() external returns (address);
}

contract ScoutProtocolProxy is Context, ProtocolAccessControl {
    using MemoryUtils for bytes32;

    constructor(address _implementationAddress, address _claimsTokenAddress) {
        require(
            _implementationAddress != address(0),
            "Invalid implementation address"
        );
        require(
            _claimsTokenAddress != address(0),
            "Invalid payment token address"
        );
        _setRole(MemoryUtils.ADMIN_SLOT, _msgSender());
        _setRole(MemoryUtils.CLAIM_MANAGER_SLOT, _msgSender());

        MemoryUtils._setAddress(
            MemoryUtils.IMPLEMENTATION_SLOT,
            _implementationAddress
        );
        MemoryUtils._setAddress(
            MemoryUtils.CLAIMS_TOKEN_SLOT,
            _claimsTokenAddress
        );
    }

    function implementation() public view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.IMPLEMENTATION_SLOT);
    }

    function setImplementation(
        address newImplementation
    ) external onlyAdmin onlyWhenNotPaused {
        require(
            newImplementation != address(0),
            "Invalid implementation address"
        );

        address currentImplementation = MemoryUtils._getAddress(
            MemoryUtils.IMPLEMENTATION_SLOT
        );
        require(
            newImplementation != currentImplementation,
            "New implementation must be different"
        );

        // Check if newImplementation is a contract
        uint32 size;
        assembly {
            size := extcodesize(newImplementation)
        }
        require(size > 0, "Invalid address, must be a smart contract");

        // Check if newImplementation accepts the upgrade
        try IImplementation(newImplementation).acceptUpgrade() returns (
            address acceptedAddress
        ) {
            require(
                acceptedAddress == newImplementation,
                "Invalid address, must accept the upgrade"
            );
        } catch {
            revert("Invalid address, must accept the upgrade");
        }

        MemoryUtils._setAddress(
            MemoryUtils.IMPLEMENTATION_SLOT,
            newImplementation
        );
    }

    function claimsToken() public view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.CLAIMS_TOKEN_SLOT);
    }

    function setClaimsToken(
        address _claimsToken
    ) external onlyAdmin onlyWhenNotPaused {
        require(_claimsToken != address(0), "Invalid payment token address");
        require(
            MemoryUtils._isContract(_claimsToken),
            "Payment token must be a contract"
        );
        MemoryUtils._setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, _claimsToken);
    }

    fallback() external payable {
        address impl = implementation();
        require(impl != address(0), "Implementation not set");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}
