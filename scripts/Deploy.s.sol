// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {DailyCheckInBadge} from "../contracts/DailyCheckInBadge.sol";

/**
 * Foundry deployment script
 * 
 * Setup:
 * 1. forge install foundry-rs/forge-std
 * 2. Set DEPLOYER_PRIVATE_KEY in .env
 * 3. Run: forge script scripts/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify
 */

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        DailyCheckInBadge contract = new DailyCheckInBadge();

        vm.stopBroadcast();

        console.log("Contract deployed at:", address(contract));
        console.log("Check-in fee:", contract.getCheckInFee());
    }
}
