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
    // npx hardhat verify --network goerli 0xA0c61F041DD1059fCE6a50D2461De63a0D47017C
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
