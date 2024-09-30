// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libs/MemoryUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BuilderNFTSeasonOneUpgradeable {
    using MemoryUtils for bytes32;

    string public constant NAME = "Scoutgame Builder";
    string public constant SYMBOL = "BUILDERS";

    // Modifier to restrict access to admin functions
    modifier onlyAdmin() {
        require(MemoryUtils.isAdmin(msg.sender), "Proxy: caller is not the admin");
        _;
    }

    constructor(
        address implementationAddress,
        address paymentTokenAddress,
        address _proceedsReceiver
    ) {
        require(implementationAddress != address(0), "Invalid implementation address");
        require(paymentTokenAddress != address(0), "Invalid payment token address");
        MemoryUtils.setAddress(MemoryUtils.ADMIN_SLOT, msg.sender);
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, implementationAddress);
        MemoryUtils.setAddress(MemoryUtils.PAYMENT_ERC20_TOKEN_SLOT, paymentTokenAddress);
        MemoryUtils.setAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT, _proceedsReceiver);

        // Init logic
        MemoryUtils.setUint256(MemoryUtils.NEXT_TOKEN_ID_SLOT, 1);
    }

    // External wrapper for setting implementation
    function setImplementation(address newImplementation) external onlyAdmin {
        _setImplementation(newImplementation);
    }

    // Internal function for setting implementation
    function _setImplementation(address newImplementation) internal {
        require(newImplementation != address(0), "Invalid implementation address");
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, newImplementation);
    }

    // External wrapper for getting implementation address
    function implementation() external view returns (address) {
        return _implementation();
    }

    // Internal function for getting implementation address
    function _implementation() internal view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT);
    }

    // External wrapper for setting proceeds receiver
    function setProceedsReceiver(address receiver) external onlyAdmin {
        _setProceedsReceiver(receiver);
    }

    // Internal function for setting proceeds receiver
    function _setProceedsReceiver(address receiver) internal {
        require(receiver != address(0), "Invalid address");
        MemoryUtils.setAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT, receiver);
    }

    // External wrapper for getting proceeds receiver
    function getProceedsReceiver() external view returns (address) {
        return _getProceedsReceiver();
    }

    // Internal function for getting proceeds receiver
    function _getProceedsReceiver() internal view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT);
    }

    // External wrapper for updating token base URI
    function updateTokenBaseUri(string memory newBaseUrl) external onlyAdmin {
        _updateTokenBaseUri(newBaseUrl);
    }

    // Internal function for updating token base URI
    function _updateTokenBaseUri(string memory newBaseUrl) internal {
        require(bytes(newBaseUrl).length > 0, "Empty base URL not allowed");
        (bool success, bytes memory returnData) = MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT).delegatecall(
            abi.encodeWithSignature("setBaseUri(string)", newBaseUrl)
        );
        require(success, _getRevertMsg(returnData));
    }

    // External wrapper for registering builder token
    function registerBuilderToken(string calldata builderId) external onlyAdmin {
        _registerBuilderToken(builderId);
    }

    // Internal function for registering builder token
    function _registerBuilderToken(string calldata builderId) internal {
        (bool success, bytes memory returnData) = MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT).delegatecall(
            abi.encodeWithSignature("registerBuilderToken(string)", builderId)
        );
        require(success, _getRevertMsg(returnData));
    }

    // External wrapper for updating price increment
    function updatePriceIncrement(uint256 newIncrement) external onlyAdmin {
        _updatePriceIncrement(newIncrement);
    }

    // Internal function for updating price increment
    function _updatePriceIncrement(uint256 newIncrement) internal {
        require(newIncrement > 2e4, "Increment must be at least 0.02$");
        MemoryUtils.setUint256(MemoryUtils.PRICE_INCREMENT_SLOT, newIncrement);
    }

    // External wrapper for updating ERC20 contract address
    function updateERC20Contract(address newContract) external onlyAdmin {
        _updateERC20Contract(newContract);
    }

    // Internal function for updating ERC20 contract address
    function _updateERC20Contract(address newContract) internal {
        require(newContract != address(0), "Invalid address");
        MemoryUtils.setAddress(MemoryUtils.PAYMENT_ERC20_TOKEN_SLOT, newContract);
    }

    // Helper function to extract revert message from delegatecall
    function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
        if (_returnData.length < 68) return "Transaction reverted silently";
        assembly {
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string));
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

    receive() external payable {
        address payable receiver = payable(this._getProceedsReceiver());

        (bool success, ) = receiver.call{value: msg.value}("");
        require(success, "Transfer to proceedsReceiver failed.");
    }
}