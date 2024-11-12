// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libs/MemoryUtils.sol";
import "../libs/ProtocolAccessControl.sol";
import "../libs/BuilderNFTStorage.sol";
import "../libs/StringUtils.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BuilderNFTSeason02Implementation is
    Context,
    ERC165,
    ProtocolAccessControl,
    IERC1155,
    IERC1155MetadataURI
{
    using MemoryUtils for bytes32;
    using BuilderNFTStorage for bytes32;
    using StringUtils for string;
    using Address for address;

    // Events
    event BuilderScouted(
        address indexed account,
        uint256 indexed tokenId,
        uint256 amount,
        string scout
    );
    event BuilderTokenRegistered(uint256 tokenId, string builderId);

    modifier onlyAdminOrMinter() {
        require(
            _isAdmin() || _hasRole(MemoryUtils.MINTER_SLOT),
            "Proxy: caller is not the admin or minter"
        );
        _;
    }

    constructor() {}

    function setBaseUri(
        string memory _prefix,
        string memory _suffix
    ) external onlyAdmin {
        require(bytes(_prefix).length > 0, "Empty base URI prefix not allowed");
        require(bytes(_suffix).length > 0, "Empty base URI suffix not allowed");
        BuilderNFTStorage.setUriPrefix(_prefix);
        BuilderNFTStorage.setUriSuffix(_suffix);
    }

    function registerBuilderToken(
        string calldata builderId
    ) external onlyAdminOrMinter {
        require(
            StringUtils._isValidUUID(builderId),
            "Builder ID must be a valid UUID"
        );
        require(
            BuilderNFTStorage.getBuilderToTokenRegistry(builderId) == 0,
            "Builder already registered"
        );

        uint256 _nextTokenId = BuilderNFTStorage.getNextTokenId();

        // Update mappings in storage
        BuilderNFTStorage.setBuilderToTokenRegistry(builderId, _nextTokenId);
        (builderId, _nextTokenId);
        BuilderNFTStorage.setTokenToBuilderRegistry(_nextTokenId, builderId);

        // Emit BuilderTokenRegistered event
        emit BuilderTokenRegistered(_nextTokenId, builderId);

        // Increment the next token ID
        BuilderNFTStorage.incrementNextTokenId();
    }

    function balanceOf(
        address account,
        uint256 tokenId
    ) public view override returns (uint256) {
        require(
            account != address(0),
            "ERC1155: balance query for the zero address"
        );
        return BuilderNFTStorage.getBalance(account, tokenId);
    }

    function balanceOfBatch(
        address[] memory accounts,
        uint256[] memory tokenIds
    ) external view override returns (uint256[] memory) {
        require(
            accounts.length == tokenIds.length,
            "ERC1155: accounts and ids length mismatch"
        );
        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], tokenIds[i]);
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) external {
        revert("Approval not allowed for soulbound tokens");
    }

    function isApprovedForAll(
        address,
        address
    ) external pure override returns (bool) {
        return false; // Approvals are not allowed for soulbound tokens
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) external pure override {
        revert("Transfers not allowed for soulbound tokens");
    }

    function safeBatchTransferFrom(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) external pure override {
        revert("Batch transfers not allowed for soulbound tokens");
    }

    function mint(
        address account,
        uint256 tokenId,
        uint256 amount,
        string calldata scout
    ) external {
        require(account != address(0), "Invalid account address");
        require(StringUtils._isValidUUID(scout), "Scout must be a valid UUID");
        // Throws if token ID is not registered
        BuilderNFTStorage.getTokenToBuilderRegistry(tokenId);

        uint256 _price = getTokenPurchasePrice(tokenId, amount);
        address _paymentToken = MemoryUtils._getAddress(
            MemoryUtils.CLAIMS_TOKEN_SLOT
        );
        address _proceedsReceiver = MemoryUtils._getAddress(
            MemoryUtils.PROCEEDS_RECEIVER_SLOT
        );

        require(_paymentToken != address(0), "Payment token not set");
        require(_proceedsReceiver != address(0), "Proceeds receiver not set");

        uint256 _proceedsReceiverBalance = IERC20(_paymentToken).balanceOf(
            _proceedsReceiver
        );

        // Transfer payment from user to proceeds receiver
        IERC20(_paymentToken).transferFrom(
            _msgSender(),
            _proceedsReceiver,
            _price
        );

        uint256 _proceedsReceiverBalanceAfterTransfer = IERC20(_paymentToken)
            .balanceOf(_proceedsReceiver);

        require(
            _proceedsReceiverBalanceAfterTransfer + _price ==
                _proceedsReceiverBalance,
            "Transfer failed"
        );

        uint256 nftBalance = BuilderNFTStorage.getBalance(account, tokenId);

        BuilderNFTStorage.increaseBalance(account, tokenId, amount);

        // Emit TransferSingle event
        emit TransferSingle(_msgSender(), address(0), account, tokenId, amount);

        // Emit BuilderScouted event
        emit BuilderScouted(account, tokenId, amount, scout);
    }

    function burn(address account, uint256 tokenId, uint256 amount) external {
        BuilderNFTStorage.decreaseBalance(account, tokenId, amount);
        // Emit TransferSingle event with the burn details
        emit TransferSingle(_msgSender(), account, address(0), tokenId, amount);
    }

    function setMinter(address _minter) external onlyAdmin {
        require(_minter != address(0), "Invalid address");
        _setRole(MemoryUtils.MINTER_SLOT, _minter);
    }

    function minter() external view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.MINTER_SLOT);
    }

    function _validateMint(
        address account,
        uint256 tokenId,
        string calldata scout
    ) internal view {}

    function setERC20() external onlyAdmin {
        MemoryUtils._setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, _msgSender());
    }

    function ERC20() external view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.CLAIMS_TOKEN_SLOT);
    }

    function getTokenPurchasePrice(
        uint256 tokenId,
        uint256 amount
    ) public view returns (uint256) {
        uint256 priceIncrement = MemoryUtils._getUint256(
            MemoryUtils.PRICE_INCREMENT_SLOT
        );
        uint256 currentSupply = totalSupply(tokenId);
        uint256 totalCost = 0;
        for (uint256 i = 0; i < amount; i++) {
            totalCost += (currentSupply + i + 1) * priceIncrement;
        }
        return totalCost;
    }

    function totalSupply(uint256 tokenId) public view returns (uint256) {
        return BuilderNFTStorage.getTotalSupply(tokenId);
    }

    function getBuilderIdForToken(
        uint256 tokenId
    ) external view returns (string memory) {
        string memory builderId = BuilderNFTStorage.getTokenToBuilderRegistry(
            tokenId
        );
        require(bytes(builderId).length > 0, "Token not yet allocated");
        return builderId;
    }

    function getTokenIdForBuilder(
        string calldata builderId
    ) external view returns (uint256) {
        uint256 tokenId = BuilderNFTStorage.getBuilderToTokenRegistry(
            builderId
        );
        require(tokenId != 0, "Builder not registered");
        return tokenId;
    }

    function totalBuilderTokens() external view returns (uint256) {
        uint256 nextTokenId = BuilderNFTStorage.getNextTokenId();

        return nextTokenId - 1;
    }

    function getPriceIncrement() external view returns (uint256) {
        return MemoryUtils._getUint256(MemoryUtils.PRICE_INCREMENT_SLOT);
    }

    function setTokenURI(
        string memory newPrefix,
        string memory newSuffix
    ) external onlyAdminOrMinter {
        BuilderNFTStorage.setUriPrefix(newPrefix);
        BuilderNFTStorage.setUriSuffix(newSuffix);
    }

    function uri(
        uint256 _tokenId
    ) external view override returns (string memory) {
        return _tokenURI(_tokenId);
    }

    function tokenURI(uint256 _tokenId) external view returns (string memory) {
        return _tokenURI(_tokenId);
    }

    function _tokenURI(uint256 _tokenId) internal view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    BuilderNFTStorage.getUriPrefix(),
                    "/",
                    StringUtils._uint2str(_tokenId),
                    "/",
                    BuilderNFTStorage.getUriSuffix()
                )
            );
    }

    function setProceedsReceiver(address receiver) external onlyAdmin {
        require(receiver != address(0), "Invalid address");
        MemoryUtils._setAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT, receiver);
    }

    function proceedsReceiver() external view returns (address) {
        return MemoryUtils._getAddress(MemoryUtils.PROCEEDS_RECEIVER_SLOT);
    }

    function name() external view returns (string memory) {
        return MemoryUtils._getString(MemoryUtils.TOKEN_NAME);
    }

    function symbol() external view returns (string memory) {
        return MemoryUtils._getString(MemoryUtils.TOKEN_SYMBOL);
    }

    function updatePriceIncrement(uint256 newIncrement) external onlyAdmin {
        MemoryUtils._setUint256(MemoryUtils.PRICE_INCREMENT_SLOT, newIncrement);
    }

    function updateERC20Contract(address newContract) external onlyAdmin {
        require(newContract != address(0), "Invalid address");
        MemoryUtils._setAddress(MemoryUtils.CLAIMS_TOKEN_SLOT, newContract);
    }

    function getERC20Contract() external view returns (uint256) {
        return MemoryUtils._getUint256(MemoryUtils.PRICE_INCREMENT_SLOT);
    }
}
