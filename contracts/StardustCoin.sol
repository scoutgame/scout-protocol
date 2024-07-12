// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StardustCoin is ERC20 {
    constructor(address owner, uint256 initialSupply) ERC20("StardustToken", "SDC") {
        _mint(owner, initialSupply);
    }
}