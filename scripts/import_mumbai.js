const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mumbai address
    const proxyAddress = "0x308815e8CF2Bbe2804b73B68E90163F3A537D4B3";

    const contractFactory = await hre.ethers.getContractFactory("SelfToken");
    console.log('Implementation address: ' + await upgrades.erc1967.getImplementationAddress(proxyAddress));
    console.log('Admin address: ' + await upgrades.erc1967.getAdminAddress(proxyAddress));

    const contract = await upgrades.forceImport(proxyAddress, contractFactory, { kind: 'transparent' });

    console.log("Done", contract);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0x4D29D29AAb8030174e876cfbB32455cDAfef6e66
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
