// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// This is a very simple contract we use to set up unit testing and make sure it works
contract Lock {
    uint256 public unlockTime;
    address public owner;

    constructor(uint256 _unlockTime) payable {
        require(_unlockTime > block.timestamp, "Unlock time should be in the future");
        unlockTime = _unlockTime;
        owner = msg.sender;
    }

    function withdraw() public {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        payable(owner).transfer(address(this).balance);
    }
}