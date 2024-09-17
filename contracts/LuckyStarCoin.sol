// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LuckyStarCoin is ERC20 {
    constructor(address owner, uint256 initialSupply) ERC20("LuckyStarCoin", "LS") {
        _mint(owner, initialSupply);
    }
}