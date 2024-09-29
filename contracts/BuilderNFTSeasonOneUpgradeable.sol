// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BuilderNFTSeasonOneMemory.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProxyWithUtils is Ownable, BuilderNFTSeasonOneMemory {
    // Modifier to ensure storage modifications only occur when storage is unlocked
    modifier whenStorageUnlocked() {
        require(!getBool(LOCK_STATUS_SLOT), "Storage is locked");
        _;
    }

    // Constructor to initialize variables and lock storage slots
    constructor(
        address _implementation,
        address _proceedsReceiver,
        uint256 _priceIncrement,
        address _paymentERC20Token,
        string memory _baseUrl,
        string memory _suffix
    ) {
        require(_implementation != address(0), "Invalid implementation address");
        require(_proceedsReceiver != address(0), "Invalid receiver address");
        require(_priceIncrement > 0, "Price increment must be greater than zero");
        require(_paymentERC20Token != address(0), "Invalid ERC20 address");

        // Initialize all variables using utility functions
        setAddress(IMPLEMENTATION_SLOT, _implementation);
        setAddress(PROCEEDS_RECEIVER_SLOT, _proceedsReceiver);
        setUint256(PRICE_INCREMENT_SLOT, _priceIncrement);
        setAddress(PAYMENT_ERC20_TOKEN_SLOT, _paymentERC20Token);
        setUint256(NEXT_TOKEN_ID_SLOT, 1); // Initialize nextTokenId to 1
        setString(BASE_URL_SLOT, _baseUrl);
        setString(SUFFIX_SLOT, _suffix);

        // Lock storage immediately after initialization
        setBool(LOCK_STATUS_SLOT, true);
    }

    // Admin function to update implementation address
    function setImplementation(address newImplementation) external onlyOwner whenStorageUnlocked {
        require(newImplementation != address(0), "Invalid implementation address");
        setAddress(IMPLEMENTATION_SLOT, newImplementation);
    }

    // Function to lock the proxy's storage
    function lockProxyStorage() external onlyOwner {
        setBool(LOCK_STATUS_SLOT, true);
    }

    // Function to unlock the proxy's storage
    function unlockProxyStorage() external onlyOwner {
        setBool(LOCK_STATUS_SLOT, false);
    }

    // Fallback function to delegate calls to the implementation contract
    fallback() external {
        address impl = getAddress(IMPLEMENTATION_SLOT);
        require(impl != address(0), "Implementation not set");

        (bool success, ) = impl.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }
}