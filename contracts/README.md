# Contracts

## ScoutToken.sol

ERC20 tokens for purchasing Builder NFT

## StargateVesting.sol

Contract to enable the Stargate Protocol to receive funds on a schedule.

## StargateProtocol.sol

Allows players to claim their points. Receives tokens and EAS attestations on a weekly basis which contain information how to distribute funds. See: [EAS Resolver Contract](https://docs.attest.org/docs/core--concepts/resolver-contracts).

## BuilderNFTSeasonOneUpgradeable.sol

ERC1155 tokens for builders

## Lock.sol

Simple locking contract that we use to set up simple set of working jest tests

## USDC Contracts

We use the official USDC contracts from Optimism so that our unit tests are accurately using the underlying contract.

USDC Contracts valid as of October 16th 2024

### FiatTokenProxy

Proxy for [USDC](https://optimistic.etherscan.io/token/0x0b2c639c533813f4aa9d7837caf62653d097ff85#code)

### FiatTokenV2_2

Implementation for [USDC](https://optimistic.etherscan.io/address/0xdEd3b9a8DBeDC2F9CB725B55d0E686A81E6d06dC#code)
