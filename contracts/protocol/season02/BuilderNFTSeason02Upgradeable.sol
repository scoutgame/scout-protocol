// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libs/MemoryUtils.sol";
import "../libs/BuilderNFTStorage.sol";
import "../libs/ProtocolAccessControl.sol";
import "../ScoutTokenERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract BuilderNFTSeason02Upgradeable is Context, ProtocolAccessControl {
    using MemoryUtils for bytes32;
    using BuilderNFTStorage for bytes32;

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

        ScoutTokenERC20 token = ScoutTokenERC20(_paymentTokenAddress);

        uint256 tokenDecimals = token.decimals();

        uint256 _priceIncrement = 2 * (10 ** tokenDecimals);

        MemoryUtils._setUint256(
            MemoryUtils.PRICE_INCREMENT_SLOT,
            _priceIncrement
        );

        MemoryUtils._setString(MemoryUtils.TOKEN_NAME, "ScoutGame Builders");
        MemoryUtils._setString(MemoryUtils.TOKEN_SYMBOL, "BUILDERS");

        BuilderNFTStorage.incrementNextTokenId();
    }

    // External wrapper for setting implementation
    function setImplementation(address newImplementation) external onlyAdmin {
        require(
            newImplementation != address(0),
            "Invalid implementation address"
        );
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
