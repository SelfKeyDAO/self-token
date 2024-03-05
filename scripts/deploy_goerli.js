const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mumbai addresses
    const authContractAddress = "0xa4a3ee13f92b6D027305f7B84FF57dA5aa98598e";

    const contractFactory = await hre.ethers.getContractFactory("SelfToken");
    const contract = await upgrades.deployProxy(contractFactory, [], { timeout: 500000 });
    await contract.deployed();

    if (contract) {
        await contract.setAuthorizationContract('0xa4a3ee13f92b6D027305f7B84FF57dA5aa98598e');
    }
    console.log("Deployed contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network goerli 0x6202A93c967F7F9dD5D4AE6de0ebA1fE4F44a39B
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
