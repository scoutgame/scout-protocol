// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./IERC7802.sol";

interface ISuperchainBridge {
    function sendERC20(
        IERC7802 _token,
        address _to,
        uint256 _amount,
        uint256 _chainId
    ) external returns (bytes32 msgHash_);

    function relayERC20(
        IERC7802 _token,
        address _from,
        address _to,
        uint256 _amount
    ) external;
}
