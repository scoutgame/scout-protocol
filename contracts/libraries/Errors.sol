// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract Errors {
    /// ======================
    /// ====== Generic =======
    /// ======================

    /// @notice Thrown as a general error when input / data is invalid
    error INVALID();

    /// @notice Thrown when not enough funds are available
    error NOT_ENOUGH_FUNDS();

    /// @notice Thrown when user is not authorized
    error UNAUTHORIZED();

    /// @notice Thrown when address is the zero address
    error ZERO_ADDRESS();

    /// @notice Thrown when the function is not implemented
    error NOT_IMPLEMENTED();
}
