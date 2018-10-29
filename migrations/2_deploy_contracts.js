var EnergyCommunity = artifacts.require("./energyCommunity.sol")

module.exports = function(deployer) {
  deployer.deploy(EnergyCommunity, web3.toWei(0.0001,'ether'),250000);
};