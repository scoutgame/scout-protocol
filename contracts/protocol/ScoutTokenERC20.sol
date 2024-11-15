// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract ScoutTokenERC20 is Context, AccessControlEnumerable, ERC20Pausable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant VESTING_ROLE = keccak256("VESTING_ROLE");
    uint256 public constant SUPPLY = 1e9 * 10 ** 18;

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to call this function"
        );
        _;
    }

    constructor(address _distributionWallet) ERC20("Scout Token", "$SCOUT") {
        _mint(_distributionWallet, SUPPLY);
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
    }

    function admin() public view returns (address) {
        return getRoleMember(DEFAULT_ADMIN_ROLE, 0);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        address _currentAdmin = admin();

        _revokeRole(DEFAULT_ADMIN_ROLE, _currentAdmin);
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
    }

    function pause() public virtual {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            "Must have pauser role to pause"
        );
        _pause();
    }

    function unpause() public virtual {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            "Must have pauser role to unpause"
        );
        _unpause();
    }
}
