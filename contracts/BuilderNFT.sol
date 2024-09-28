// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BuilderNFT is ERC1155, Ownable {

    uint256 public nextTokenId;
    address public proceedsReceiver;   // Global proceeds receiver
    uint256 public priceIncrement;     // Global price increment for all tokens - linear curve
    IERC20 public usdcToken;           // ERC20 token (USDC)

    event BuilderTokenRegistered(uint256 tokenId, string uuid);
    event BuilderScouted(uint256 tokenId, uint256 amount, string scoutId);

    mapping(uint256 => string) private tokenToBuilderRegistry;
    mapping(string => uint256) private builderToTokenRegistry;
    mapping(uint256 => uint256) private _totalSupply;

    // Constructor to initialize proceedsReceiver, priceIncrement, and USDC token address
    constructor(string memory uri_, address _proceedsReceiver, uint256 _priceIncrement, address _usdcToken) ERC1155(uri_) Ownable(msg.sender) {
        require(_proceedsReceiver != address(0), "Invalid receiver address");
        require(_priceIncrement > 0, "Price increment must be greater than zero");
        require(_usdcToken != address(0), "Invalid USDC address");

        proceedsReceiver = _proceedsReceiver;
        priceIncrement = _priceIncrement;
        usdcToken = IERC20(_usdcToken);
        nextTokenId = 1;
    }

    function isValidUUID(string memory uuid) internal pure returns (bool) {
        bytes memory uuidBytes = bytes(uuid);
        return uuidBytes.length == 36 &&
            uuidBytes[8] == "-" &&
            uuidBytes[13] == "-" &&
            uuidBytes[18] == "-" &&
            uuidBytes[23] == "-";
    }

    // Register a new builder token
    function registerBuilderToken(string calldata builderId) external onlyOwner {
        require(isValidUUID(builderId), "Builder ID must be valid v4 uuid");

        uint256 existingBuilderTokenId = builderToTokenRegistry[builderId];
        require(existingBuilderTokenId == 0, "Builder already registered");

        tokenToBuilderRegistry[nextTokenId] = builderId;
        builderToTokenRegistry[builderId] = nextTokenId;

        emit BuilderTokenRegistered(nextTokenId, builderId);
        nextTokenId++;
    }

    // Buy token using USDC
    function buyToken(uint256 tokenId, uint256 amount, string calldata scout) external {
        require(bytes(tokenToBuilderRegistry[tokenId]).length > 0, "Token not registered");
        require(builderToTokenRegistry[tokenToBuilderRegistry[tokenId]] == tokenId, "Builder-token mismatch");
        require(amount > 0, "Must buy at least one token");

        uint256 cost = getTokenPurchasePrice(tokenId, amount);
        require(usdcToken.approve(address(this), cost), "Insufficient USDC allowance");

        // Transfer USDC from buyer to the proceeds receiver
        require(usdcToken.transfer(proceedsReceiver, cost), "USDC transfer failed");

        _mint(msg.sender, tokenId, amount, "");
        _totalSupply[tokenId] += amount;

        emit BuilderScouted(tokenId, amount, scout);
    }

    // Update the proceeds receiver
    function updateProceedsReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "Invalid address");
        proceedsReceiver = newReceiver;
    }

    // Get the next price for the token
    function getNextPrice(uint256 currentSupply) public view returns (uint256) {
        return (currentSupply + 1) * priceIncrement; // Linear bonding curve
    }

    // Calculate the total price for the tokens
    function getTokenPurchasePrice(uint256 tokenId, uint256 amount) public view returns (uint256) {
        uint256 currentSupply = totalSupply(tokenId);
        uint256 totalCost = 0;
        for (uint256 i = 0; i < amount; i++) {
            totalCost += getNextPrice(currentSupply + i);
        }
        return totalCost;
    }

    function mint(address account, uint256 tokenId, uint256 amount) external onlyOwner {
      require(bytes(tokenToBuilderRegistry[tokenId]).length > 0, "Token not registered");
      _mint(account, tokenId, amount, "");
      _totalSupply[tokenId] += amount;
    }

    // Get total supply of a specific token
    function totalSupply(uint256 tokenId) public view returns (uint256) {
        return _totalSupply[tokenId];
    }

    function getBuilderIdForToken(uint256 tokenId) public view returns (string memory) {
        string memory builderId = tokenToBuilderRegistry[tokenId];
        require(bytes(builderId).length > 0, "Token not registered");
        return builderId;
    }

    function getTokenIdForBuilder(string calldata builderId) public view returns (uint256) {
        uint256 tokenId = builderToTokenRegistry[builderId];
        require(tokenId != 0, "Builder not registered");
        return tokenId;
    }

    function totalBuilderTokens() public view returns (uint256) {
        return nextTokenId - 1;
    }

    function adjustPriceIncrement(uint256 newPriceIncrement) external onlyOwner {
        require(newPriceIncrement > 0, "Price increment must be greater than zero");
        priceIncrement = newPriceIncrement;
    }

    function getPriceIncrement() public view returns (uint256) {
        return priceIncrement;
    }
}