// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.22;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ud60x18} from "@prb/math/src/UD60x18.sol";
import {ud60x18} from "@prb/math/src/UD60x18.sol";
import {ISablierV2LockupTranched} from "@sablier/v2-core/src/interfaces/ISablierV2LockupTranched.sol";
import {Broker, LockupTranched} from "@sablier/v2-core/src/types/DataTypes.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// Import here so that it is compiled and included in the hardhat artifacts
import {SablierV2NFTDescriptor} from "@sablier/v2-core/src/SablierV2NFTDescriptor.sol";
import {SablierV2LockupTranched} from "@sablier/v2-core/src/SablierV2LockupTranched.sol";

/// @notice Example of how to create a Lockup Linear stream.
/// @dev This code is referenced in the docs: https://docs.sablier.com/contracts/v2/guides/create-stream/lockup-linear
contract LockupWeeklyStreamCreator is Context {
    using Strings for uint256;
    // sepolia addresses
    IERC20 public SCOUT;

    ISablierV2LockupTranched public LOCKUP_TRANCHED;

    constructor(address _erc20, address _lockupTranched) {
        SCOUT = IERC20(_erc20);
        LOCKUP_TRANCHED = ISablierV2LockupTranched(_lockupTranched);
    }

    /// @dev For this function to work, the sender must have approved this dummy contract to spend SCOUT.
    function createStream(
        address recipient,
        uint128 totalAmount,
        uint128 _startDate,
        uint128 _weeks
    ) public returns (uint256 streamId) {
        // Transfer the provided amount of SCOUT tokens to this contract
        SCOUT.transferFrom(msg.sender, address(this), totalAmount);

        uint40 firstClaim = getStartDateOffset(_startDate);

        // Approve the Sablier contract to spend SCOUT
        SCOUT.approve(address(LOCKUP_TRANCHED), totalAmount);

        // Declare the params struct
        LockupTranched.CreateWithDurations memory params;

        // Declare the function parameters
        params.sender = msg.sender; // The sender will be able to cancel the stream
        params.recipient = address(recipient); // The recipient of the streamed assets
        params.totalAmount = uint128(totalAmount); // Total amount is the amount inclusive of all fees
        params.asset = SCOUT; // The streaming asset
        params.cancelable = true; // Whether the stream will be cancelable or not
        params.transferable = true; // Whether the stream will be transferable or not

        // Declare some dummy tranches
        params.tranches = new LockupTranched.TrancheWithDuration[](_weeks);

        uint128 _streamed = 0;

        uint128 _amountPerWeek = totalAmount / _weeks;

        for (uint256 i = 0; i < _weeks; i++) {
            if (i == 0) {
                params.tranches[i] = LockupTranched.TrancheWithDuration({
                    amount: _amountPerWeek,
                    duration: firstClaim
                });

                _streamed += _amountPerWeek;
            } else if (i != _weeks - 1) {
                params.tranches[i] = LockupTranched.TrancheWithDuration({
                    amount: _amountPerWeek,
                    duration: 1 weeks
                });

                _streamed += _amountPerWeek;
            } else {
                uint128 _remainder = totalAmount - _streamed;
                params.tranches[i] = LockupTranched.TrancheWithDuration({
                    amount: _remainder,
                    duration: 1 weeks
                });

                _streamed += _remainder;
            }
        }

        // Wondering what's up with that ud60x18 function? It's a casting function that wraps a basic integer to the UD60x18 value type. This type is part of the math library PRBMath, which is used in Sablier for fixed-point calculations.
        params.broker = Broker(address(0), ud60x18(0)); // Optional parameter left undefined

        // Create the LockupTranched stream
        streamId = LOCKUP_TRANCHED.createWithDurations(params);
    }

    function claim(uint256 streamId) public {
        LockupTranched.StreamLT memory stream = LOCKUP_TRANCHED.getStream(
            streamId
        );

        LOCKUP_TRANCHED.withdrawMax(streamId, stream.recipient);
    }

    function cancelStream(uint256 streamId) public {
        LOCKUP_TRANCHED.cancel(streamId);
    }

    function getStartDateOffset(
        uint128 startDate
    ) public view returns (uint40) {
        // Revert if the start date is in the past
        require(
            uint40(startDate) >= uint40(block.timestamp),
            "Start date must be in the future"
        );

        // Return the difference between startDate and block.timestamp
        return uint40(startDate - block.timestamp);
    }

    function _weeksToSeconds(uint256 _weeks) internal pure returns (uint256) {
        return _weeks * 60 * 60 * 24 * 7;
    }
}
