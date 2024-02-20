const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const selfContractFactory = await hre.ethers.getContractFactory("SelfToken");
    const contract = await upgrades.deployProxy(selfContractFactory, [], { timeout: 500000 });
    await contract.deployed();
    console.log("Deployed contract address:", contract.address);

    if (contract) {
        await contract.setAuthorizationContract('0x1e4BBcF6c10182C03c66bDA5BE6E04509bE1160F');
        await contract.setGovernanceContractAddress('0x2cfEa17cFD338a0aA9D358F2bfD8e78dFf39e4be');
        await contract.setMintableRegistryContractAddress('0xfAA8d6Ce9A457567bF81c00496DfC07959025bA4');
    }

    // npx hardhat verify --network mumbai 0x308815e8CF2Bbe2804b73B68E90163F3A537D4B3
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
