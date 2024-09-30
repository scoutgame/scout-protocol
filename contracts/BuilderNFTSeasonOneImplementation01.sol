// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libs/MemoryUtils.sol";
// import "./libs/Validators.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
}

contract BuilderNFTSeasonOneImplementation01 is Context, ERC165, IERC1155, IERC1155MetadataURI {
    using MemoryUtils for bytes32;
    using Address for address;

    // Events
    event BuilderScouted(uint256 tokenId, uint256 amount, string scout);
    event BuilderTokenRegistered(uint256 tokenId, string builderId);

    modifier onlyAdmin() {
        require(MemoryUtils.isAdmin(msg.sender), "Proxy: caller is not the admin");
        _;
    }


    constructor () {}

    function uri(uint256) public view override returns (string memory) {
        return ImplementationStorage.layout().baseUri;
    }

    function setBaseUri(string memory newBaseUri) external {
        require(bytes(newBaseUri).length > 0, "Empty base URI not allowed");
        ImplementationStorage.layout().baseUri = newBaseUri;
    }

    function registerBuilderToken(string calldata builderId) external {
        require(isValidUUID(builderId), "Builder ID must be a valid UUID");
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

    function mintTo(address account, uint256 tokenId, uint256 amount, string calldata scout) external onlyAdmin {
      require(account != address(0), "Invalid account address");
      require(isValidUUID(scout), "Scout must be a valid UUID");

      // Check the tokenId exists
      this.getBuilderIdForToken(tokenId);


      ImplementationStorage.Layout storage s = ImplementationStorage.layout();

      // Mint tokens
      s.balances[tokenId][account] += amount;

      // Update total supply
      s.totalSupply[tokenId] += amount;

      // Emit TransferSingle event
      emit TransferSingle(msg.sender, address(0), account, tokenId, amount);

      // Emit BuilderScouted event
      emit BuilderScouted(tokenId, amount, scout);
  }


    // Mint function for users
    function mint(address _account, uint256 tokenId, uint256 amount, string calldata scout) external {
        revert("User minting is currently disabled");
        //
        require(isValidUUID(scout), "Scout must be a valid UUID");
        require(bytes(ImplementationStorage.layout().tokenToBuilderRegistry[tokenId]).length > 0, "Token not registered");

        uint256 price = getTokenPurchasePrice(tokenId, amount);
        address paymentToken = MemoryUtils.getAddress(MemoryUtils.PAYMENT_ERC20_TOKEN_SLOT);
        address proceedsReceiver = MemoryUtils.getAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT);

        require(paymentToken != address(0), "Payment token not set");
        require(proceedsReceiver != address(0), "Proceeds receiver not set");

        IERC20(paymentToken).transferFrom(msg.sender, proceedsReceiver, price);

        // Mint tokens
        ImplementationStorage.layout().balances[tokenId][_account] += amount;
        emit TransferSingle(_msgSender(), address(0), _account, tokenId, amount);

        // Update total supply
        ImplementationStorage.layout().totalSupply[tokenId] += amount;

        // Emit BuilderScouted event
        emit BuilderScouted(tokenId, amount, scout);
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
        require(bytes(builderId).length > 0, "Token not yet allocated");
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

    function tokenURI(uint256 _tokenId) external pure returns (string memory) {
      return string.concat("https://nft.scoutgame.xyz/2024-W40/beta/", uint2str(_tokenId), "/artwork.png");
        // string memory baseUri = ImplementationStorage.layout().baseUri;
        // return string(abi.encodePacked(baseUri, uint2str(_tokenId)));
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

      // Validate if a string is a valid UUID
    function isValidUUID(string memory uuid) public pure returns (bool) {
        bytes memory uuidBytes = bytes(uuid);
        return uuidBytes.length == 36 &&
            uuidBytes[8] == "-" &&
            uuidBytes[13] == "-" &&
            uuidBytes[18] == "-" &&
            uuidBytes[23] == "-";
    }

        // Validators
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        return account.code.length > 0;
    }
}