// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BuilderTokens is ERC1155, Ownable {

    struct BuilderToken {
        uint256 totalSupply;
        uint256 price;  // Starting price for the bonding curve
        uint256 reserve;  // Holds the total funds received from sales
        address payable proceedsReceiver; // Where the funds go
    }

    uint256 public nextTokenId;
    mapping(uint256 => BuilderToken) public builderTokens; // Maps tokenId to BuilderToken

    event BuilderTokenRegistered(uint256 tokenId, address proceedsReceiver, uint256 price);

    // Pass the URI to the ERC1155 constructor
    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {}

    // Register a new builder token
    function registerBuilderToken(address payable proceedsReceiver, uint256 startPrice) external onlyOwner {
        require(proceedsReceiver != address(0), "Invalid receiver address");

        builderTokens[nextTokenId] = BuilderToken({
            totalSupply: 0,
            price: startPrice,
            reserve: 0,
            proceedsReceiver: proceedsReceiver
        });

        emit BuilderTokenRegistered(nextTokenId, proceedsReceiver, startPrice);
        nextTokenId++;
    }

    // Buy a specific builder's token based on bonding curve
    function buyToken(uint256 tokenId, uint256 amount) external payable {
        require(amount > 0, "Must buy at least one token");

        BuilderToken storage token = builderTokens[tokenId];

        uint256 cost = getBatchPurchasePrice(tokenId, amount);

        require(msg.value == cost, "Incorrect ETH sent");

        token.totalSupply += amount;
        token.reserve += msg.value;

        // Mint the token to the buyer
        _mint(msg.sender, tokenId, amount, "");

        // Transfer the funds to the proceeds receiver
        token.proceedsReceiver.transfer(msg.value);
    }

    // Update proceeds receiver address
    function updateProceedsReceiver(uint256 tokenId, address payable newReceiver) external onlyOwner {
        require(newReceiver != address(0), "Invalid address");
        builderTokens[tokenId].proceedsReceiver = newReceiver;
    }

    // Calculate the cost of the tokens using a simple linear bonding curve
    function getNextPrice(uint256 currentSupply) public pure returns (uint256) {
        uint256 totalCost = (currentSupply + 1 ) * 2; // Linear bonding curve
        return totalCost;
    }

    function getTokenPurchasePrice(uint256 tokenId) public view returns (uint256) {
        uint256 currentSupply = builderTokens[tokenId].totalSupply;

        uint256 nextPrice = getNextPrice(currentSupply);
        
        return nextPrice;
    }

    function getBatchPurchasePrice(uint256 tokenId, uint256 amount) public view returns (uint256) {
        uint256 currentSupply = builderTokens[tokenId].totalSupply;

        uint256 totalCost = 0;
        for (uint256 i = 0; i < amount; i++) {
            totalCost += getNextPrice(currentSupply + i);
        }

        return totalCost;
    }
}