import { ethers, run, network } from "hardhat";
import { tokenData, contractsAddresses } from "../hardhat.config";
import { MyBridge, MyBridge__factory } from "../src/types";

const delay = async (time: number) => {
  return new Promise((resolve: any) => {
    setInterval(() => {
      resolve();
    }, time);
  });
};

async function main() {
  Object.keys(tokenData).forEach((tokenName) => {
    if (!tokenData[tokenName].address) {
      throw new Error(
        `Prior tokens deployment is required in tokenData.\
Please run deployTokens.ts first`
      );
    }
  });
  const MyContract: MyBridge__factory =
    await ethers.getContractFactory("MyBridge");
  const myContract: MyBridge = await MyContract.deploy(
    tokenData.tokenETH.address
  );

  await myContract.deployed();

  console.log(`The bridge contract has been deployed to ${myContract.address}`);

  console.log("wait of delay...");
  await delay(15000); // delay 30 seconds
  console.log("starting verify token...");
  try {
    await run("verify:verify", {
      address: myContract!.address,
      contract: "contracts/MyBridge.sol:MyBridge",
      constructorArguments: [tokenData.tokenETH.address],
    });
    console.log("verify success");
    return;
  } catch (e: any) {
    console.log(e.message);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
