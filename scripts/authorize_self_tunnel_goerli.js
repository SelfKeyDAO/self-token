const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);


    // Mumbai addresses
    const selfAddress = "0x6202A93c967F7F9dD5D4AE6de0ebA1fE4F44a39B";
    const tunnelAddress = "0xF421c01E188bEaac6F702D50213F289772BE01Cc";

    const contractFactory = await hre.ethers.getContractFactory("SelfToken");
    const contract = await contractFactory.attach(selfAddress);

    if (contract) {
        await contract.addAuthorizedCaller(tunnelAddress);
    }
    console.log("Changed contract address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
