import { task } from "hardhat/config";
import { ContractTransaction, ContractReceipt, BytesLike } from "ethers";
import { Address } from "cluster";
import { MyBridge, MyBridge__factory } from "../src/types";

task("addValidator", "Add validator role to the bridge contract")
  .addParam("addContract", "Address of the brdige contract")
  .addOptionalParam("addAddress", "address to add to the role")
  .setAction(async ({ addContract, addAddress }, { ethers }) => {
    const Factory: MyBridge__factory =
      await ethers.getContractFactory("MyBridge");
    const myContract: MyBridge = Factory.attach(addContract!);
    addAddress = addAddress || (await ethers.provider.getSigner().getAddress());
    const tx: ContractTransaction = await myContract.grantRole(
      await myContract.VALIDATOR_ROLE(),
      addAddress
    );
    const receipt: ContractReceipt = await tx.wait();

    const event = receipt.events?.find(
      (event) => event.event === "RoleGranted"
    );
    const roleSet: BytesLike = ethers.utils.formatBytes32String(
      event?.args!["role"]
    );
    const accountSet: Address = event?.args!["account"];
    const roleGranter: Address = event?.args!["sender"];
    console.log(`Role: ${ethers.utils.parseBytes32String(roleSet)}`);
    console.log(`Role set by: ${accountSet}`);
    console.log(`Role granted to: ${roleGranter}`);
  });
