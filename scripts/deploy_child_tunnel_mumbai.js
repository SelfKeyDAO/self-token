const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mumbai addresses
    const fxChildAddress = "0xCf73231F28B7331BBe3124B907840A94851f9f11";
    const selfTokenAddress = "0x308815e8CF2Bbe2804b73B68E90163F3A537D4B3";

    const contractFactory = await hre.ethers.getContractFactory("FxSelfChildTunnel");
    const contract = await contractFactory.deploy( fxChildAddress, selfTokenAddress);
    await contract.deployed();

    console.log("Deployed contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0x811380a66088127996AdB6C57277d77fce5C6D24
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
