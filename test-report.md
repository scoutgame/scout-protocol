# Test Report

## Contract: BuilderNFTPreSeason02Implementation

### Write Methods

#### registerBuilderToken()

- **Effects**:
  - Register a new builder token using a builderId
- **Permissions**:
  - Normal users cannot register a builder token
  - Minter can register a builder token
- **Validations**:
  - Revert if the builderId is already registered
  - Revert if the builderId is empty
  - Revert if the builderId is an invalid uuid
- **Events**:
  - Emits BuilderTokenRegistered event new tokenId and builderId

#### mint()

- **Effects**:
  - Mints tokens to a user account
  - Increments total supply of the token
- **Permissions**:
  - Allows any user to mint tokens if they pay the price
- **Validations**:
  - Reverts if tokenId is not registered
- **Events**:
  - Emits TransferSingle and BuilderScouted events on mint

#### burn()

- **Effects**:
  - Burns tokens from a user account
  - Decrements total supply of the token
- **Permissions**:
  - Allows token owner to burn tokens
  - Allows approved operator to burn tokens
  - Prevents burning tokens if not owner nor approved
- **Validations**:
  - Reverts if burning more tokens than balance
- **Events**:
  - Emits TransferSingle event on burn

#### setApprovalForAll()

- **Effects**:
  - Sets operator approval for the caller
- **Permissions**:
  - Allows any user to set operator approval
- **Validations**:
  - Reverts if setting approval for self
- **Events**:
  - Emits ApprovalForAll event

#### safeTransferFrom()

- **Effects**:
  - Transfers tokens from one account to another
- **Permissions**:
  - Allows token owner to transfer tokens
  - Allows approved operator to transfer tokens
  - Prevents transferring tokens if not owner nor approved
- **Validations**:
  - Reverts if caller is not owner nor approved
  - Reverts if transferring more tokens than balance
- **Events**:
  - Emits TransferSingle event on transfer

#### safeBatchTransferFrom()

- **Effects**:
  - Transfers multiple tokens from one account to another
- **Permissions**:
  - Allows token owner to transfer tokens
  - Allows approved operator to transfer tokens
  - Prevents transferring tokens if not owner nor approved
- **Validations**:
  - Reverts if transferring more tokens than balance
- **Events**:
  - Emits TransferBatch event on transfer

## Contract: BuilderNFTPreSeason02Upgradeable

### Write Methods

#### setImplementation()

- **Effects**:
  - Updates the implementation address correctly
- **Permissions**:
  - Allows admin to set implementation
  - Prevents non-admin from setting implementation
- **Validations**:
  - Reverts if new implementation address is zero address
  - Reverts if new implementation address is an EOA wallet
  - Reverts if new implementation address is an EOA wallet
  - Reverts if new implementation address is the same as current

### Read Methods

#### implementation()

- **Returns**:
  - Returns the current implementation address

## Contract: LockupWeeklyStreamCreator

### Write Methods

#### createStream()

- **Effects**:
  - creates a claimable, and cancellable stream for the protocol
  - immediately deducts the balance from the stream creator

#### claim()

- **Effects**:
  - allows the recipient to claim the stream, unlocked in weekly increments
  - allows the protocol contract to receive a stream, unlocked in weekly increments by any wallet

#### (SablierLockupTranched) cancel()

- **Effects**:
  - allows the stream creator to cancel the stream and receive a refund for the remaining assets

## Contract: MemoryUtils

### Read Methods

#### IMPLEMENTATION_SLOT

- **Returns**:
  - the correct value, compliant with EIP 1967

#### PROCEEDS_RECEIVER_SLOT

- **Returns**:
  - the correct value

#### CLAIMS_TOKEN_SLOT

- **Returns**:
  - the correct value

#### MINTER_SLOT

- **Returns**:
  - the correct value

#### CLAIMS_HISTORY_SLOT

- **Returns**:
  - the correct value

#### MERKLE_ROOTS_SLOT

- **Returns**:
  - the correct value

#### ADMIN_SLOT

- **Returns**:
  - the correct value

#### PAUSER_SLOT

- **Returns**:
  - the correct value

#### CLAIM_MANAGER_SLOT

- **Returns**:
  - the correct value

#### EAS_ATTESTER_SLOT

- **Returns**:
  - the correct value

#### SECONDARY_EAS_ATTESTER_SLOT

- **Returns**:
  - the correct value

#### IS_PAUSED_SLOT

- **Returns**:
  - the correct value

## Contract: ProtocolAccessControl

### Write Methods

#### transferAdmin

- **Effects**:
  - allows admin to transfer admin
- **Permissions**:
  - reverts when not called by admin
- **Validations**:
  - reverts when setting to zero address

#### setRole

- **Effects**:
  - sets a role to a new account
- **Validations**:
  - reverts when setting to zero address
- **Events**:
  - emits a RoleTransferred event with roleName, previous and new holder if the new holder is different from the previous one

#### pause

- **Effects**:
  - marks the contract as paused
- **Permissions**:
  - can be paused by the pauser role 
  - reverts when called by non-pauser and non-admin
- **Events**:
  - emits Paused event when paused

#### unPause

- **Effects**:
  - allows admin to unpause the contract
- **Permissions**:
  - reverts when called by non-admin
- **Events**:
  - emits Unpaused event when unpaused

#### testPaused


#### setPauser

- **Effects**:
  - allows admin to set a new pauser
- **Permissions**:
  - reverts when not called by admin
- **Validations**:
  - reverts when setting to zero address
- **Events**:
  - emits a RoleTransferred event when pauser is changed

## Contract: ProtocolEASResolver

### Write Methods

#### setAttesterWallet

- **Effects**:
  - updates the attester wallet correctly
- **Permissions**:
  - allows authorized users
  - denies unauthorized users
- **Validations**:
  - reverts when input is invalid

#### rolloverAttesterWallet

- **Effects**:
  - updates the attester wallets correctly and sets the current attester as secondary attester
- **Permissions**:
  - allows authorized users
  - denies unauthorized users
- **Validations**:
  - reverts when input is invalid

#### transferAdmin

- **Effects**:
  - updates the admin correctly
- **Permissions**:
  - allows authorized users
  - denies unauthorized users
- **Validations**:
  - reverts when input is invalid

#### onAttest

- **Validations**:
  - allows the attester wallet to attest
  - prevents other wallets than the attester wallet from attesting

## Contract: ScoutProtocolImplementation

### Write Methods

#### claim

- **Effects**:
  - allows a user to claim tokens correctly
- **Permissions**:
  - reverts when the contract is paused
- **Validations**:
  - denies claims if user has already claimed
  - reverts with invalid merkle proof
  - reverts when merkle root is not set
  - reverts when contract balance is insufficient

#### setMerkleRoot

- **Effects**:
  - allows admin to set merkle root correctly
- **Permissions**:
  - reverts when the contract is paused
  - reverts when not called by admin
  - allows the claims manager to set the merkle root

#### setClaimsManager()

- **Effects**:
  - Sets the claims manager
- **Permissions**:
  - reverts when not called by admin

## Contract: ScoutProtocolProxy

### Write Methods

#### setImplementation()

- **Effects**:
  - Updates the implementation address correctly
- **Permissions**:
  - Allows admin to set implementation
  - Prevents non-admin from setting implementation
- **Validations**:
  - Reverts if new implementation address is zero address
  - Reverts if new implementation address is an EOA wallet
  - Reverts if new implementation address is an EOA wallet
  - Reverts if new implementation address is the same as current

