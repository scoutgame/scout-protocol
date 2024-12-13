// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "../../libs/ProtocolAccessControl.sol";
import "./IERC7802.sol";

contract ScoutTokenERC20 is Context, ERC20, ProtocolAccessControl, IERC7802 {
    uint256 public constant SUPPLY = 1e9 * 10 ** 18;
    address internal constant DEFAULT_SUPERCHAIN_BRIDGE_ADDRESS =
        0x4200000000000000000000000000000000000028;
    address internal constant DEFAULT_L2_MESSENGER_ADDRESS =
        0x4200000000000000000000000000000000000023;
    bytes32 internal constant SUPERCHAIN_BRIDGE_SLOT =
        keccak256("erc20.superchainBridge");
    bytes32 internal constant L2_MESSENGER_SLOT =
        keccak256("erc20.l2Messenger");

    modifier onlySuperchainBridgeOrMessenger() {
        require(
            _msgSender() == superchainBridge() || _msgSender() == l2Messenger(),
            "Must be superchain bridge or messenger to call this function"
        );
        _;
    }

    constructor(
        address _admin,
        address _distributionWallet
    ) ERC20("Scout Token", "$SCOUT") {
        // Enables us to only mint tokens if the distribution wallet is set. This paves the way for IERC7802 to be implemented by ensuring we do not duplicate the supply.
        if (_distributionWallet != address(0)) {
            _mint(_distributionWallet, SUPPLY);
        }
        MemoryUtils._setAddress(MemoryUtils.ADMIN_SLOT, _admin);
        StorageSlot
            .getAddressSlot(SUPERCHAIN_BRIDGE_SLOT)
            .value = DEFAULT_SUPERCHAIN_BRIDGE_ADDRESS;
        StorageSlot
            .getAddressSlot(L2_MESSENGER_SLOT)
            .value = DEFAULT_L2_MESSENGER_ADDRESS;
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public returns (bool) {
        uint256 _currentAllowance = allowance(_msgSender(), spender);
        approve(spender, addedValue + _currentAllowance);
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public returns (bool) {
        uint256 _currentAllowance = allowance(_msgSender(), spender);
        require(
            _currentAllowance >= subtractedValue,
            "ERC20: decreased allowance below zero"
        );
        approve(spender, _currentAllowance - subtractedValue);
        return true;
    }

    // See example of crosschainMint and crosschainBurn in https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/L2/SuperchainERC20.sol
    function crosschainMint(
        address _account,
        uint256 _amount
    ) external onlySuperchainBridgeOrMessenger {
        _mint(_account, _amount);
        emit CrosschainMint(_account, _amount, _msgSender());
    }

    function crosschainBurn(
        address _from,
        uint256 _amount
    ) external onlySuperchainBridgeOrMessenger {
        _burn(_from, _amount);
        emit CrosschainBurn(_from, _amount, _msgSender());
    }

    function superchainBridge() public view returns (address) {
        return StorageSlot.getAddressSlot(SUPERCHAIN_BRIDGE_SLOT).value;
    }

    function l2Messenger() public view returns (address) {
        return StorageSlot.getAddressSlot(L2_MESSENGER_SLOT).value;
    }

    function setSuperchainBridge(address _superchainBridge) external onlyAdmin {
        StorageSlot
            .getAddressSlot(SUPERCHAIN_BRIDGE_SLOT)
            .value = _superchainBridge;
    }

    function setL2Messenger(address _l2Messenger) external onlyAdmin {
        StorageSlot.getAddressSlot(L2_MESSENGER_SLOT).value = _l2Messenger;
    }

    function supportsInterface(
        bytes4 _interfaceId
    ) public pure override returns (bool) {
        return
            _interfaceId == type(IERC7802).interfaceId ||
            _interfaceId == type(IERC20).interfaceId ||
            _interfaceId == type(IERC165).interfaceId;
    }
}
