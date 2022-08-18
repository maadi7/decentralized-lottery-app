const { network, ethers } = require("hardhat");
const {developmentChains} = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;
module.exports = async function({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK]
    const chainId = network.config.chainId;
    if(chainId == 31337){
        log("Local Network Detected! Deploying mocks.......");
        await deploy("VRFCoordinatorV2Mock",{
            from: deployer,
            log: true,
            args: args,
        });

        log("MOCK DEPLOYED")
        log("-------------------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"];