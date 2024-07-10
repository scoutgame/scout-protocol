// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract StarDustCoin is ERC20 {
    constructor() ERC20("SD", "CHARM") {
        _mint(msg.sender, 1000000000);
    }
    // receiveTokens (sender, recipient, bytes : data) public {
    //     IERC20(_token).transfer(_to, _amount);
    // }
}
