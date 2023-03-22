const { utils, Wallet } = require("zksync-web3");
const ethers = require("ethers");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

// An example of a deploy script that will deploy and call a simple contract.
module.exports = async function (hre) {
  console.log(`Running deploy script for the Greeter contract`);
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  // Initialize the wallet.
  const wallet = new Wallet(PRIVATE_KEY);
  //console.log("wallet:",wallet);

  // Create deployer object and load the artifact of the contract we want to deploy.
  const deployer = new Deployer(hre, wallet);
  const artifactToken = await deployer.loadArtifact("Token");
  const AmmArtifact = await deployer.loadArtifact("CPAMM");

  // Deposit some funds to L2 in order to be able to perform L2 transactions.
  /*  const depositAmount = ethers.utils.parseEther("0.001");
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: utils.ETH_ADDRESS,
    amount: depositAmount,
  }); */
  // Wait until the deposit is processed on zkSync
  //await depositHandle.wait();

  const argsA = ["1000000", "TokenA", "TKNA"];
  const tokenAContract = await deployer.deploy(artifactToken, argsA);

  // Show the contract info.
  const contractAddressA = tokenAContract.address;
  console.log(
    `${artifactToken.contractName} was deployed to ${contractAddressA}`
  );
  const argsB = ["1000000", "TokenB", "TKNB"];
  const tokenBContract = await deployer.deploy(artifactToken, argsB);

  // Show the contract info.
  const contractAddressB = tokenBContract.address;
  console.log(
    `${artifactToken.contractName} was deployed to ${contractAddressB}`
  );

  console.log("Deploying Amm...");
  const args = [contractAddressA, contractAddressB];
  const AmmContract = await deployer.deploy(AmmArtifact, args);

  // Show the contract info.
  const AmmContractAddress = AmmContract.address;
  console.log(
    `${AmmArtifact.contractName} was deployed to ${AmmContractAddress}`
  );
};
