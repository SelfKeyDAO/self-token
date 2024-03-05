// scripts/propose_upgrade.js
const { defender } = require('hardhat');

async function main() {
  const proxyAddress = '0x308815e8CF2Bbe2804b73B68E90163F3A537D4B3';

  const contractV2 = await ethers.getContractFactory("SelfToken");
  console.log("Preparing proposal...");
  const proposal = await defender.proposeUpgrade(proxyAddress, contractV2);
  console.log("Upgrade proposal created at:", proposal.url);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
