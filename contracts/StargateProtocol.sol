// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/EAS.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ExpirationTimeResolver
/// @notice A sample schema resolver that checks whether the expiration time is later than a specific timestamp.
contract StargateProtocol is SchemaResolver {
    // EAS public easContract;
    IERC20 public token;
    mapping(address account => uint256) private _unclaimedBalances;

    // constructor(IEAS eas) SchemaResolver(eas) {
    //     easContract = EAS(eas);
    // }

    constructor(IEAS eas, address _token) SchemaResolver(eas) {
        token = IERC20(_token);
    }

    // method that is called by the EAS contract when an attestation is made
    function onAttest(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal override returns (bool) {
        uint256 addedBalance = decodeValue(attestation.data);
        _unclaimedBalances[attestation.recipient] += addedBalance;
        return true;
    }

    // method that is called by the EAS contract when an attestation is revoked
    function onRevoke(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal pure override returns (bool) {
        return true;
    }

    function getUnclaimedBalance(
        address account
    ) public view virtual returns (uint256) {
        return _unclaimedBalances[account];
    }

    function getTokenBalance(
        address account
    ) public view virtual returns (uint256) {
        return token.balanceOf(account);
    }

    // allow the sender to claim their balance as ERC20 tokens
    function claimBalance(uint amount) public returns (bool) {
        require(
            _unclaimedBalances[msg.sender] >= amount,
            "Insufficient unclaimed balance"
        );
        uint contractHolding = token.balanceOf(address(this));
        require(contractHolding >= amount, "Insufficient balance in contract");
        _unclaimedBalances[msg.sender] =
            _unclaimedBalances[msg.sender] -
            amount;
        // send tokens from contract to recipient
        token.transferFrom(address(this), msg.sender, amount);
        return true;
    }

    // deposit funds to the contract
    function depositFunds(uint256 amount) public {
        token.transferFrom(msg.sender, address(this), amount);
    }

    struct AttestationData {
        uint256 value; // Assuming the "value" field is uint256
    }

    // Function to decode the EAS attestation data

    // TODO: simplify how we decode the data from a schema. Example:
    // function decodeData(
    //     bytes memory data
    // ) public pure returns (uint256, string memory) {
    //     (uint256 number, string memory text) = abi.decode(data, (uint256, string));
    //     return (number, text);
    // }

    function decodeValue(
        bytes memory attestationData
    ) internal pure returns (uint256) {
        uint256 value;

        // Decode the attestation data
        assembly {
            // Skip the length field of the byte array
            attestationData := add(attestationData, 0x20)

            // Read the slot (32 bytes)
            value := mload(add(attestationData, 0x00))

            // // Read the committee index (32 bytes)
            // data.committeeIndex := mload(add(attestationData, 0x20))

            // // Read the beacon block root (32 bytes)
            // data.beaconBlockRoot := mload(add(attestationData, 0x40))
        }
        return value;
    }
}
