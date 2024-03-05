const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Goerli addresses
    const checkpointManagerAddress = "0x2890bA17EfE978480615e330ecB65333b880928e";
    const fxRootAddress = "0x3d1d3E34f7fB6D26245E6640E1c50710eFFf15bA";
    const selfTokenAddress = "0x6202A93c967F7F9dD5D4AE6de0ebA1fE4F44a39B";

    const contractFactory = await hre.ethers.getContractFactory("FxSelfRootTunnel");
    const contract = await contractFactory.deploy( checkpointManagerAddress, fxRootAddress, selfTokenAddress);
    await contract.deployed();

    console.log("Deployed contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network goerli 0xF421c01E188bEaac6F702D50213F289772BE01Cc 0x2890bA17EfE978480615e330ecB65333b880928e 0x3d1d3E34f7fB6D26245E6640E1c50710eFFf15bA 0x6202A93c967F7F9dD5D4AE6de0ebA1fE4F44a39B
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
