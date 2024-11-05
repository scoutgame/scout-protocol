// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "./libs/MemoryUtils.sol";
import "./libs/ProtocolAccessControl.sol";

/// @title ScoutGameProtocol
/// @notice A schema resolver that manages unclaimed balances based on EAS attestations.
contract ProtocolEASResolver is SchemaResolver, Context, ProtocolAccessControl {
    using MemoryUtils for bytes32;

    constructor(IEAS eas, address _attesterWallet) SchemaResolver(eas) {
      setAdmin(_msgSender());
    }

    // Method that is called by the EAS contract when an attestation is made
    //
    function onAttest(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal override returns (bool) {
        require(attestation.attester == attesterWallet(), "Invalid attester");
        return true;
    }

    // Method that is called by the EAS contract when an attestation is revoked
    function onRevoke(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal pure override returns (bool) {
        return true;
    }

    function setAttesterWallet(address _attesterWallet) external onlyAdmin {
      require(_attesterWallet != address(0), "Invalid attester wallet address");
      MemoryUtils.setAddress(MemoryUtils.ATTESTER_WALLET_SLOT, _msgSender());
    }

    function attesterWallet() public view {
      return MemoryUtils.getAddress(MemoryUtils.ATTESTER_WALLET_SLOT);
    }
}