// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../libs/MemoryUtils.sol";
import "../../libs/ScoutProtocolBuilderNFTStorage.sol";
import "../../libs/ScoutProtocolAccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IImplementation {
    function acceptUpgrade() external returns (address);
}

contract ScoutProtocolBuilderNFTUpgradeable is
    Context,
    ScoutProtocolAccessControl
{
    using MemoryUtils for bytes32;
    using ScoutProtocolBuilderNFTStorage for bytes32;

    uint256 public constant ERC20_DECIMALS = 6;

    constructor(
        address _implementationAddress,
        address _paymentTokenAddress,
        address _proceedsReceiver
    ) {
        require(
            _implementationAddress != address(0),
            "Invalid implementation address"
        );
        require(
            _paymentTokenAddress != address(0),
            "Invalid payment token address"
        );
        MemoryUtils._setAddress(MemoryUtils.ADMIN_SLOT, msg.sender);
        MemoryUtils._setAddress(
            MemoryUtils.IMPLEMENTATION_SLOT,
            _implementationAddress
        );
        MemoryUtils._setAddress(
            MemoryUtils.CLAIMS_TOKEN_SLOT,
            _paymentTokenAddress
        );
        MemoryUtils._setAddress(
            MemoryUtils.PROCEEDS_RECEIVER_SLOT,
            _proceedsReceiver
        );

        uint256 _priceIncrement = 2 * (10 ** ERC20_DECIMALS);

        MemoryUtils._setUint256(
            MemoryUtils.PRICE_INCREMENT_SLOT,
            _priceIncrement
        );

        MemoryUtils._setString(MemoryUtils.TOKEN_NAME, "ScoutGame Builders");
        MemoryUtils._setString(MemoryUtils.TOKEN_SYMBOL, "BUILDERS");

        ScoutProtocolBuilderNFTStorage.incrementNextTokenId();
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
