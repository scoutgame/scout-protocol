// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./libs/MemoryUtils.sol";

contract Proxy {
    using MemoryUtils for bytes32;

    // Modifier to restrict access to admin functions
    modifier onlyAdmin() {
        require(msg.sender == MemoryUtils.getAddress(MemoryUtils.ADMIN_SLOT), "Proxy: caller is not the admin");
        _;
    }

    constructor(address implementationAddress) {
        require(implementationAddress != address(0), "Invalid implementation address");
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, implementationAddress);
        MemoryUtils.setAddress(MemoryUtils.ADMIN_SLOT, msg.sender);
    }

    // Existing admin functions
    function setImplementation(address newImplementation) external onlyAdmin {
        require(newImplementation != address(0), "Invalid implementation address");
        MemoryUtils.setAddress(MemoryUtils.IMPLEMENTATION_SLOT, newImplementation);
    }

    function getImplementation() external view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT);
    }

    function setProceedsReceiver(address receiver) external onlyAdmin {
        require(receiver != address(0), "Invalid address");
        MemoryUtils.setAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT, receiver);
    }

    function getProceedsReceiver() external view returns (address) {
        return MemoryUtils.getAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT);
    }

    // New admin functions using delegatecall

    // Mint tokens to a specific account
    function mintTo(address account, uint256 tokenId, uint256 amount, string calldata scout) external onlyAdmin {
        (bool success, bytes memory returnData) = MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT).delegatecall(
            abi.encodeWithSignature(
                "adminMintTo(address,uint256,uint256,string)",
                account,
                tokenId,
                amount,
                scout
            )
        );
        require(success, _getRevertMsg(returnData));
    }

    // Update the proceeds receiver
    function updateProceedsReceiver(address newReceiver) external onlyAdmin {
        require(newReceiver != address(0), "Invalid address");
        MemoryUtils.setAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT, newReceiver);
    }

    // Register a new builder token
    function registerBuilderToken(string calldata builderId) external onlyAdmin {
        (bool success, bytes memory returnData) = MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT).delegatecall(
            abi.encodeWithSignature("adminRegisterBuilderToken(string)", builderId)
        );
        require(success, _getRevertMsg(returnData));
    }

    // Update the base URI for tokens
    function updateTokenBaseUri(string memory newBaseUrl) external onlyAdmin {
        require(bytes(newBaseUrl).length > 0, "Empty base URL not allowed");
        (bool success, bytes memory returnData) = MemoryUtils.getAddress(MemoryUtils.IMPLEMENTATION_SLOT).delegatecall(
            abi.encodeWithSignature("setBaseUri(string)", newBaseUrl)
        );
        require(success, _getRevertMsg(returnData));
    }

    // Update the price increment
    function updateIncrement(uint256 _newIncrement) external onlyAdmin {
        require(_newIncrement > 2e4, "Increment must be minimum 0.02$");
        MemoryUtils.setUint256(MemoryUtils.PRICE_INCREMENT_SLOT, _newIncrement);
    }

    // Update the ERC20 payment token contract address
    function updateERC20Contract(address _newContract) external onlyAdmin {
        require(_newContract != address(0), "Invalid address");
        MemoryUtils.setAddress(MemoryUtils.PAYMENT_ERC20_TOKEN_SLOT, _newContract);
    }

    // Adjust the price increment
    function adjustPriceIncrement(uint256 newPriceIncrement) external onlyAdmin {
        require(newPriceIncrement > 0, "Price increment must be greater than zero");
        MemoryUtils.setUint256(MemoryUtils.PRICE_INCREMENT_SLOT, newPriceIncrement);
    }

    // Helper function to extract revert message from delegatecall
    function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
        // If the _returnData length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "Transaction reverted silently";
        assembly {
            // Slice the sighash
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
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

    receive() external payable {}
}
