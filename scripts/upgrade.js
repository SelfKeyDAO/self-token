const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const proxyAddress = "0x308815e8CF2Bbe2804b73B68E90163F3A537D4B3"; // Mumbai
    // const proxyAddress = "0x64450DA938d06bE7EEc68E4Ead99FfF05D8Cebe7"; // Polygon

    const contractFactory = await hre.ethers.getContractFactory("SelfToken");
    const contract = await upgrades.upgradeProxy(proxyAddress, contractFactory, { timeout: 500000 });
    await contract.deployed();

    console.log("Deployed contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0x308815e8CF2Bbe2804b73B68E90163F3A537D4B3
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
