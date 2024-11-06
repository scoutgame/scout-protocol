// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
// Importing the EAS contracts here so that they are included in the compilation tree and available in artifacts
import "@ethereum-attestation-service/eas-contracts/contracts/EAS.sol";
import "@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol";

// import "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import "./libs/MemoryUtils.sol";
import "./libs/ProtocolAccessControl.sol";


/// @title ScoutGameProtocol
/// @notice A schema resolver that manages unclaimed balances based on EAS attestations.
contract ProtocolEASResolver is SchemaResolver, Context, ProtocolAccessControl {
    using MemoryUtils for bytes32;

    constructor(IEAS eas, address _attesterWallet) SchemaResolver(eas) {
      _setRole(MemoryUtils.ADMIN_SLOT, _msgSender());
      _setRole(MemoryUtils.EAS_ATTESTER_SLOT, _attesterWallet);
    }

    // Method that is called by the EAS contract when an attestation is made
    //
    function onAttest(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal override returns (bool) {
        require(attestation.attester == attesterWallet() || attestation.attester == secondaryAttesterWallet(), "Invalid attester");
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
      MemoryUtils._setAddress(MemoryUtils.EAS_ATTESTER_SLOT, _attesterWallet);
    }

    function rolloverAttesterWallet(address _attesterWallet) external onlyAdmin {
      require(_attesterWallet != address(0), "Invalid attester wallet address");

      address _currentAttester = attesterWallet();

      MemoryUtils._setAddress(MemoryUtils.SECONDARY_EAS_ATTESTER_SLOT, _msgSender());

      MemoryUtils._setAddress(MemoryUtils.EAS_ATTESTER_SLOT, _msgSender());
    }

    function attesterWallet() public view returns (address) {
      return MemoryUtils._getAddress(MemoryUtils.EAS_ATTESTER_SLOT);
    }

    function secondaryAttesterWallet() public view returns (address) {
      return MemoryUtils._getAddress(MemoryUtils.SECONDARY_EAS_ATTESTER_SLOT);
    }
}