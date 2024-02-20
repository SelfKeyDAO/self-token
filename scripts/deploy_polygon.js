const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const selfContractFactory = await hre.ethers.getContractFactory("SelfToken");
    const contract = await upgrades.deployProxy(selfContractFactory, [], { timeout: 500000 });
    await contract.deployed();
    console.log("Deployed contract address:", contract.address);

    if (contract) {
        await contract.setAuthorizationContract('0x9928D9e849317983760a61FC486696001f387C6E');
        await contract.setGovernanceContractAddress('0x8860868aE39c8690B49451E9bcE3EB884FF79B68');
        await contract.setMintableRegistryContractAddress('0x64450DA938d06bE7EEc68E4Ead99FfF05D8Cebe7');
    }

    // npx hardhat verify --network polygon 0x9A52D47193D8F1E6aF312ba241fb325f2f6A89fF
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
