/**
 * Hardhat deployment script for DailyCheckInBadge contract
 * 
 * Setup:
 * 1. npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
 * 2. npx hardhat init (if not already initialized)
 * 3. Set DEPLOYER_PRIVATE_KEY in .env
 * 4. Run: npx hardhat run scripts/deploy-hardhat.js --network baseSepolia
 */

const hre = require("hardhat");

async function main() {
  console.log("Deploying DailyCheckInBadge contract...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const DailyCheckInBadge = await hre.ethers.getContractFactory("DailyCheckInBadge");
  const contract = await DailyCheckInBadge.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("Contract address:", address);
  console.log("\n📝 Update CONTRACT_ADDRESS in lib/contract.ts with:");
  console.log(`export const CONTRACT_ADDRESS = "${address}";`);
  
  // Verify fee is set correctly
  const fee = await contract.getCheckInFee();
  console.log("\n💰 Check-in fee:", hre.ethers.formatEther(fee), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
