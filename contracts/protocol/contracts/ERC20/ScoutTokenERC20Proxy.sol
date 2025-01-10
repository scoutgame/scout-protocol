// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../libs/MemoryUtils.sol";
import "../../libs/ScoutProtocolAccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../ERC20/ScoutTokenERC20Implementation.sol";

interface IImplementation {
    function acceptUpgrade() external returns (address);
}

contract ScoutTokenERC20Proxy is Context, ScoutProtocolAccessControl {
    using MemoryUtils for bytes32;

    address internal constant DEFAULT_SUPERCHAIN_BRIDGE_ADDRESS =
        0x4200000000000000000000000000000000000028;
    address internal constant DEFAULT_L2_MESSENGER_ADDRESS =
        0x4200000000000000000000000000000000000023;

    /// We need to pass the admin so that we can support cross-chain transfers.
    /// Otherwise our usual pattern on contract is for the admin to be _msgSender() by default
    constructor(address _implementation, address _admin) {
        MemoryUtils._setAddress(MemoryUtils.ADMIN_SLOT, _admin);
        MemoryUtils._setAddress(
            MemoryUtils.IMPLEMENTATION_SLOT,
            _implementation
        );
        MemoryUtils._setAddress(
            MemoryUtils.SUPERCHAIN_BRIDGE_SLOT,
            DEFAULT_SUPERCHAIN_BRIDGE_ADDRESS
        );
        MemoryUtils._setAddress(
            MemoryUtils.L2_MESSENGER_SLOT,
            DEFAULT_L2_MESSENGER_ADDRESS
        );
    }

    function setImplementation(address newImplementation) external onlyAdmin {
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

    // External wrapper for getting implementation address
    function implementation() public view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.IMPLEMENTATION_SLOT);
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
