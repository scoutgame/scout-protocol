// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ScoutVesting is Ownable {
    IERC20 public scoutToken;
    address public scoutGameProtocol;

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 duration;
        uint256 releasedAmount;
    }

    mapping(address => VestingSchedule) public vestingSchedules;
    address[] public employees;
    VestingSchedule public protocolVestingSchedule;

    event TokensVested(address indexed beneficiary, uint256 amount);
    event ProtocolVestingScheduleAdded(
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration
    );

    constructor(
        address _scoutToken,
        address _scoutGameProtocol
    ) Ownable(msg.sender) {
        scoutToken = IERC20(_scoutToken);
        scoutGameProtocol = _scoutGameProtocol;
    }

    function addEmployee(
        address employee,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration
    ) external onlyOwner {
        require(
            vestingSchedules[employee].totalAmount == 0,
            "Employee already exists"
        );

        vestingSchedules[employee] = VestingSchedule({
            totalAmount: totalAmount,
            startTime: startTime,
            duration: duration,
            releasedAmount: 0
        });

        employees.push(employee);
    }

    function addProtocolVestingSchedule(
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration
    ) external onlyOwner {
        require(
            protocolVestingSchedule.totalAmount == 0,
            "Protocol vesting schedule already exists"
        );

        protocolVestingSchedule = VestingSchedule({
            totalAmount: totalAmount,
            startTime: startTime,
            duration: duration,
            releasedAmount: 0
        });

        emit ProtocolVestingScheduleAdded(totalAmount, startTime, duration);
    }

    function vest() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule found");

        uint256 vestedAmount = calculateVestedAmount(schedule);
        uint256 claimableAmount = vestedAmount - schedule.releasedAmount;

        require(claimableAmount > 0, "No tokens available for vesting");

        schedule.releasedAmount += claimableAmount;
        require(
            scoutToken.transfer(msg.sender, claimableAmount),
            "Token transfer failed"
        );

        emit TokensVested(msg.sender, claimableAmount);
    }

    function vestForProtocol() external {
        require(
            msg.sender == scoutGameProtocol,
            "Only ScoutGameProtocol can call this function"
        );
        require(
            protocolVestingSchedule.totalAmount > 0,
            "No protocol vesting schedule found"
        );

        uint256 vestedAmount = calculateVestedAmount(protocolVestingSchedule);
        uint256 claimableAmount = vestedAmount -
            protocolVestingSchedule.releasedAmount;

        require(claimableAmount > 0, "No tokens available for vesting");

        protocolVestingSchedule.releasedAmount += claimableAmount;
        require(
            scoutToken.transfer(scoutGameProtocol, claimableAmount),
            "Token transfer failed"
        );

        emit TokensVested(scoutGameProtocol, claimableAmount);
    }

    function calculateVestedAmount(
        VestingSchedule memory schedule
    ) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime) {
            return 0;
        } else if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.totalAmount;
        } else {
            return
                (schedule.totalAmount *
                    (block.timestamp - schedule.startTime)) / schedule.duration;
        }
    }

    function getVestedAmount(address employee) external view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[employee];
        return calculateVestedAmount(schedule);
    }

    function getProtocolVestedAmount() external view returns (uint256) {
        return calculateVestedAmount(protocolVestingSchedule);
    }

    function updateScoutGameProtocol(
        address _newScoutGameProtocol
    ) external onlyOwner {
        scoutGameProtocol = _newScoutGameProtocol;
    }
}
