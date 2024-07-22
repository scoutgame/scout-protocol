// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title StargateProtocol
/// @notice A schema resolver that manages unclaimed balances of StardustCoin based on EAS attestations.
contract StargateProtocol is SchemaResolver {
    IERC20 public token;
    mapping(address => uint256) private _unclaimedBalances;

    // Define a constant for 18 decimals
    uint256 constant DECIMALS = 10**18;

    constructor(IEAS eas, address _token) SchemaResolver(eas) {
        token = IERC20(_token);
    }

    // Method that is called by the EAS contract when an attestation is made
    function onAttest(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal override returns (bool) {
        uint256 addedBalance = 10 * DECIMALS;
        _unclaimedBalances[attestation.recipient] += addedBalance;
        return true;
    }

    // Method that is called by the EAS contract when an attestation is revoked
    function onRevoke(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal pure override returns (bool) {
        return true;
    }

    function getUnclaimedBalance(address account) public view returns (uint256) {
        return _unclaimedBalances[account];
    }

    function getTokenBalance(address account) public view returns (uint256) {
        return token.balanceOf(account);
    }

    // Allow the sender to claim their balance as ERC20 tokens
    function claimBalance(uint256 amount) public returns (bool) {
        require(_unclaimedBalances[msg.sender] >= amount, "Insufficient unclaimed balance");
        uint256 contractHolding = token.balanceOf(address(this));
        require(contractHolding >= amount, "Insufficient balance in contract");

        _unclaimedBalances[msg.sender] -= amount;
        token.transfer(msg.sender, amount);
        return true;
    }

    // Deposit funds to the contract
    function depositFunds(uint256 amount) public {
        token.transferFrom(msg.sender, address(this), amount);
    }

    function decodeValue(bytes memory attestationData) internal pure returns (uint256) {
        uint256 value;

        // Decode the attestation data
        assembly {
            // Skip the length field of the byte array
            attestationData := add(attestationData, 0x20)

            // Read the value (32 bytes)
            value := mload(add(attestationData, 0x00))
        }
        return value;
    }
}