# Simple ICO implementation

## Description

TEST The MyICO contract is a custom ICO (Initial Coin Offering) contract. It allows users to purchase tokens using USD and claim their tokens at a later time. Here are the important details of the contract:

- The contract has an `initialize` function that can only be called by the admin role to set the start times for buying and claiming tokens.
- The contract has a `buyToken` function that allows users to purchase tokens using USD. The function converts the USD amount to TST tokens based on the exchange rate and checks if the user's balance is within the allowed range.
- The contract has a `\_getClaimable` internal function that calculates the amount of tokens that can be claimed by a user based on the percentage and the user's purchased tokens.
- The contract has a `getAvailableAmount` function that calculates the amount of tokens that can be claimed by a user at the current time based on the elapsed time since the claim start.
- The contract has a `withdrawTokens` function that allows users to claim their available tokens. The function checks if the claim period has started and transfers the tokens to the user.
- The contract has a `withdrawUSD` function that can only be called by the admin role to withdraw the remaining USD tokens from the contract.

This contract provides a simple and secure way for users to participate in the ICO by purchasing tokens and claiming them at the appropriate time.

## Deployed contract example

You can find and test my deployed contract in goerli testnet by this address: [0x6C5d3aba885c93cd9299C918Fc27a1D66468CDeB](https://mumbai.polygonscan.com/address/0x6C5d3aba885c93cd9299C918Fc27a1D66468CDeB)

## Installation

Clone the repository using the following command:
Install the dependencies using the following command:

```
npm i
```

## Deployment

Fill in all the required environment variables(copy .env-example to .env and fill it).
Note:

- Mnemonic is 12 words phrase you can obtain while creating a new account (in Metamask for example)
- RPC_URL may be choosen here: https://chainlist.org
- ETHERSCAN may be obtained in your account profile on etherscan

Deploy contract to the chain (mumbai testnet):

```
npx hardhat run scripts/deploy.ts --network goerli (or polygon-mumbai)
```

## Tasks

Create new task(s) ans save it(them) in the folder "tasks". Add a new task name in the file "tasks/index.ts".

Running a task:

```
npx hardhat addLiquidity --token-a {TOKEN_A ADDRESS} --token-b {TOKEN_B ADDRESS} --value-a 10000000 --value-b 10000000 --network goerli
```

Note: Replace {TOKEN\_\* ADDRESS} with the address of the token.

## Verification

Verify the installation by running the following command:

```
npx hardhat verify --network goerli {CONTRACT_ADDRESS}
```

Note: Replace {CONTRACT_ADDRESS} with the address of the contract
