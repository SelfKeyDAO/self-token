const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // const authorizationContractAddress = "0x50C3fb3E713D5DF018dE4A9352C8ee9F32e8dDF9";

    const selfContractFactory = await hre.ethers.getContractFactory("SelfToken");
    const contract = await upgrades.deployProxy(selfContractFactory, []);
    await contract.deployed();
    console.log("Deployed contract address:", contract.address);

    /*
    const contract = await selfContractFactory.deploy(authorizationContractAddress);
    console.log("Deployed contract address:", contract.address);
    */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
