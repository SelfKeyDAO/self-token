// scripts/propose_upgrade.js
const { defender } = require('hardhat');

async function main() {
  const proxyAddress = '0x4bf6902f681E679E436b9bb2addbF330B04050e4';

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
