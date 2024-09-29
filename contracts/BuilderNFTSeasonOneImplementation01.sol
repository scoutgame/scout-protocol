// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./BuilderNFTSeasonOneMemory.sol";

contract SoulboundERC1155 is Context, ERC165, IERC1155, IERC1155MetadataURI {
    using Address for address;

    constructor(string memory uri_) {
        _setURI(uri_);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(IERC1155MetadataURI).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function uri(uint256) public view override returns (string memory) {
        bytes32 memSlot = BuilderNFTSeasonOneMemory.BASE_URL_SLOT;
        return BuilderNFTSeasonOneMemory.getString( BuilderNFTSeasonOneMemory.BASE_URL_SLOT);  // Use storage slot for base URI
    }

    function balanceOf(address account, uint256 id) public view virtual override returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        return BuilderNFTSeasonOneMemory.getUint256(keccak256(abi.encodePacked("balances", id, account)));  // Get balance using unstructured storage
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view virtual override returns (uint256[] memory) {
        require(accounts.length == ids.length, "ERC1155: accounts and ids length mismatch");

        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        require(_msgSender() != operator, "ERC1155: setting approval status for self");
        // For soulbound, disable approval functionality
        revert("Soulbound: Approval not allowed");
    }

    function isApprovedForAll(address, address) public view virtual override returns (bool) {
        return false;  // For soulbound, approval is not allowed
    }

    // Modified to prevent transfers for soulbound tokens
    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public virtual override {
        revert("Soulbound: Transfers not allowed");
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory) public virtual override {
        revert("Soulbound: Transfers not allowed");
    }

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external {
        require(to != address(0), "ERC1155: mint to the zero address");
        uint256 currentBalance = BuilderNFTSeasonOneMemory.getUint256(keccak256(abi.encodePacked("balances", id, to)));
        BuilderNFTSeasonOneMemory.setUint256(keccak256(abi.encodePacked("balances", id, to)), currentBalance + amount);

        emit TransferSingle(_msgSender(), address(0), to, id, amount);
        _doSafeTransferAcceptanceCheck(_msgSender(), address(0), to, id, amount, data);
    }

    // Internal function to update the URI
    function _setURI(string memory newuri) internal virtual {
        BuilderNFTSeasonOneMemory.setString(BuilderNFTSeasonOneMemory.BASE_URL_SLOT(), newuri);  // Store the new URI in unstructured storage
    }

    function _doSafeTransferAcceptanceCheck(address operator, address from, address to, uint256 id, uint256 amount, bytes memory data) private {
        if (to.isContract()) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155Received.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }
}