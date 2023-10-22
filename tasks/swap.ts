import { task } from "hardhat/config";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { contractsAddresses, chainIds } from "../hardhat.config";
import { Address } from "cluster";
import { MyBridge, MyBridge__factory } from "../src/types";
import { connectDB } from "../db/mongooseConnect";
import { Transaction } from "../db/schema";

task("swap", "Swap tokens to the other chain. Emits an event")
  .addParam("recipient", "address of the recipient")
  .addParam("amount", "amount of tokens to swap")
  .setAction(async ({ recipient, amount }, { ethers, network }) => {
    const Factory: MyBridge__factory =
      await ethers.getContractFactory("MyBridge");
    const myContract: MyBridge = Factory.attach(
      contractsAddresses[network.name]!
    );
    await connectDB();
    const tx: ContractTransaction = await myContract.swap(recipient, amount);
    const receipt: ContractReceipt = await tx.wait();

    const event = receipt.events?.find(
      (event) => event.event === "Transfer" && event.args!["swapType"] === 0
    );
    const from: Address = event?.args!["from"];
    const to: Address = event?.args!["to"];
    const swapAmount: Address = event?.args!["amount"];
    const nonceValue: Address = event?.args!["nonce"];
    console.log("Successfully swaped tokens");
    console.log(
      `Swap: ${from} to: ${to} with amount: ${swapAmount} and nonce: ${nonceValue}`
    );
    const newTransaction = new Transaction({
      nonce: nonceValue.toString(),
      sender: from,
      recipient: to,
      amount: swapAmount.toString(),
      initChainId: contractsAddresses[network.name]!,
    });
    await newTransaction.save();
  });
