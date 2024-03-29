# SELF token


## Overview

ERC20 Token contract with user initiated minting backed by KYC signed authorization checks

## Development

All smart contracts are implemented in Solidity `^0.8.19`, using [Hardhat](https://hardhat.org/) as the Solidity development framework.

### Prerequisites

* [NodeJS](htps://nodejs.org), v16.1.0+
* [Hardhat](https://hardhat.org/), which is a comprehensive framework for Ethereum development.

### Initialization

    `npm install`

### Testing

    `npx hardhat test`

### Deploy

    `npx hardhat run scripts/deploy.js --network mumbai`
    `npx hardhat verify --network mumbai 0x0Ad5B4b01f56117fB480363117a951c12b231c03`

## Contributing
Please see the [contributing notes](CONTRIBUTING.md).

## Copyright
Copyright SelfKey DAO Foundation 2024. All rights reserved.
