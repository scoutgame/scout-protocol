// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./libs/MemoryUtils.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

library ImplementationStorage {
    struct Layout {
        mapping(uint256 => mapping(address => uint256)) balances;
        mapping(uint256 => uint256) totalSupply;
        mapping(uint256 => string) tokenToBuilderRegistry;
        mapping(string => uint256) builderToTokenRegistry;
        string baseUri;
    }

    bytes32 internal constant STORAGE_SLOT = keccak256("builderNFT.implementation.storage");

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }

    // Validate UUID (implement actual validation as needed)
    function isValidUUID(string memory uuid) internal pure returns (bool) {
        // Simple length check for illustration
        return bytes(uuid).length == 36;
    }
}

contract ImplementationERC1155 is Context, ERC165, IERC1155, IERC1155MetadataURI {
    using MemoryUtils for bytes32;
    using Address for address;

    modifier onlyAdmin() {
        require(msg.sender == MemoryUtils.getAddress(MemoryUtils.ADMIN_SLOT), "Implementation: caller is not the admin");
        _;
    }

    // Events
    event BuilderScouted(uint256 tokenId, uint256 amount, string scout);
    event BuilderTokenRegistered(uint256 tokenId, string builderId);

    constructor(string memory baseUri) {
        // Initialize base URI in storage
        ImplementationStorage.layout().baseUri = baseUri;
    }

    // Admin functions called via delegatecall from proxy

    function adminMintTo(address account, uint256 tokenId, uint256 amount, string calldata scout) external onlyAdmin {
        require(ImplementationStorage.isValidUUID(scout), "Scout must be a valid UUID");
        require(bytes(ImplementationStorage.layout().tokenToBuilderRegistry[tokenId]).length > 0, "Token not registered");
        require(account != address(0), "ERC1155: mint to the zero address");

        // Mint tokens
        ImplementationStorage.layout().balances[tokenId][account] += amount;
        emit TransferSingle(_msgSender(), address(0), account, tokenId, amount);

        // Update total supply
        ImplementationStorage.layout().totalSupply[tokenId] += amount;

        // Emit BuilderScouted event
        emit BuilderScouted(tokenId, amount, scout);
    }

    function adminRegisterBuilderToken(string calldata builderId) external onlyAdmin {
        require(ImplementationStorage.isValidUUID(builderId), "Builder ID must be a valid UUID");
        require(ImplementationStorage.layout().builderToTokenRegistry[builderId] == 0, "Builder already registered");

        uint256 nextTokenId = MemoryUtils.getUint256(MemoryUtils.NEXT_TOKEN_ID_SLOT);

        // Update mappings in storage
        ImplementationStorage.layout().tokenToBuilderRegistry[nextTokenId] = builderId;
        ImplementationStorage.layout().builderToTokenRegistry[builderId] = nextTokenId;

        // Emit BuilderTokenRegistered event
        emit BuilderTokenRegistered(nextTokenId, builderId);

        // Increment the next token ID
        MemoryUtils.setUint256(MemoryUtils.NEXT_TOKEN_ID_SLOT, nextTokenId + 1);
    }

    function setBaseUri(string memory newBaseUri) external onlyAdmin {
        require(bytes(newBaseUri).length > 0, "Empty base URI not allowed");
        ImplementationStorage.layout().baseUri = newBaseUri;
    }

    // User functions

    function uri(uint256) public view override returns (string memory) {
        return ImplementationStorage.layout().baseUri;
    }

    function balanceOf(address account, uint256 id) public view override returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        return ImplementationStorage.layout().balances[id][account];
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view override returns (uint256[] memory) {
        require(accounts.length == ids.length, "ERC1155: accounts and ids length mismatch");
        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }

        return batchBalances;
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Approval not allowed for soulbound tokens");
    }

    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false; // Approvals are not allowed for soulbound tokens
    }

    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public pure override {
        revert("Transfers not allowed for soulbound tokens");
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory) public pure override {
        revert("Batch transfers not allowed for soulbound tokens");
    }

    function mint(address to, uint256 id, uint256 amount) external {
        // Regular users can call this function
        require(to != address(0), "ERC1155: mint to the zero address");
        require(bytes(ImplementationStorage.layout().tokenToBuilderRegistry[id]).length > 0, "Token not registered");

        ImplementationStorage.layout().balances[id][to] += amount;
        emit TransferSingle(_msgSender(), address(0), to, id, amount);

        // Update total supply
        ImplementationStorage.layout().totalSupply[id] += amount;
    }

    function getTokenPurchasePrice(uint256 tokenId, uint256 amount) public view returns (uint256) {
        uint256 currentSupply = totalSupply(tokenId);
        uint256 totalCost = 0;
        for (uint256 i = 0; i < amount; i++) {
            totalCost += getNextPrice(currentSupply + i);
        }
        return totalCost;
    }

    function getNextPrice(uint256 supply) internal view returns (uint256) {
        uint256 priceIncrement = MemoryUtils.getUint256(MemoryUtils.PRICE_INCREMENT_SLOT);
        return supply * priceIncrement;
    }

    function totalSupply(uint256 tokenId) public view returns (uint256) {
        return ImplementationStorage.layout().totalSupply[tokenId];
    }

    function getBuilderIdForToken(uint256 tokenId) public view returns (string memory) {
        string memory builderId = ImplementationStorage.layout().tokenToBuilderRegistry[tokenId];
        require(bytes(builderId).length > 0, "Token not registered");
        return builderId;
    }

    function getTokenIdForBuilder(string calldata builderId) public view returns (uint256) {
        uint256 tokenId = ImplementationStorage.layout().builderToTokenRegistry[builderId];
        require(tokenId != 0, "Builder not registered");
        return tokenId;
    }

    function totalBuilderTokens() public view returns (uint256) {
        uint256 nextTokenId = MemoryUtils.getUint256(MemoryUtils.NEXT_TOKEN_ID_SLOT);
        return nextTokenId - 1;
    }

    function getPriceIncrement() public view returns (uint256) {
        return MemoryUtils.getUint256(MemoryUtils.PRICE_INCREMENT_SLOT);
    }

    function getTokenURI(uint256 tokenId) public view returns (string memory) {
        string memory baseUri = ImplementationStorage.layout().baseUri;
        return string(abi.encodePacked(baseUri, uint2str(tokenId)));
    }

    // Utility function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        // Edge case for zero
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len - 1;
        while (_i != 0) {
            bstr[k--] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
}
