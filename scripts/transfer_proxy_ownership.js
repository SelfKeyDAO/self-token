// scripts/propose_upgrade.js
const { ethers, upgrades } = require('hardhat');

async function main() {
  const proxyAddress = '0x4bf6902f681E679E436b9bb2addbF330B04050e4';
  const multiSig = '0xEEe838366A062fB6BEb230D0636410813f758295';


  const contractV2 = await ethers.getContractFactory("SelfToken");
  console.log("Preparing proposal...");
  const proposal = await upgrades.admin.transferProxyAdminOwnership(multiSig);
  console.log("Transferred ownership to :", multiSig);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
