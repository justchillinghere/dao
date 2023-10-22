import { task } from "hardhat/config";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { contractsAddresses, chainIds, mnemonic } from "../hardhat.config";
import { Address } from "cluster";
import { MyBridge, MyBridge__factory } from "../src/types";
import { connectDB } from "../db/mongooseConnect";
import { Transaction } from "../db/schema";
import {
  generateMessage,
  signMessage,
  splitSignature,
} from "../utils/signature";

task("redeem", "Redeem tokens from the other chain. Emits an event")
  .addParam("rec", "recipient address")
  .setAction(async ({ rec }, { ethers, network }) => {
    const Factory: MyBridge__factory =
      await ethers.getContractFactory("MyBridge");
    const myContract: MyBridge = Factory.attach(
      contractsAddresses[network.name]!
    );
    const mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic!);
    const signer = await ethers.getSigner(mnemonicWallet.address);
    await connectDB();
    const [redeemData] = await Transaction.find({
      nonceUsed: false,
      recipient: rec,
    });

    if (!redeemData) {
      console.log("No transactions to redeem");
      return;
    }
    const { sender, recipient, amount, nonce, initChainId } = redeemData;

    let message = generateMessage(
      sender,
      recipient,
      BigNumber.from(amount),
      BigNumber.from(nonce),
      BigNumber.from(initChainId)!,
      BigNumber.from(chainIds[network.name])!
    );
    let signature = await signMessage(message, signer);
    let vrs = splitSignature(signature);

    const tx: ContractTransaction = await myContract.redeem(
      sender,
      recipient,
      amount,
      nonce,
      BigNumber.from(initChainId),
      BigNumber.from(chainIds[network.name])!,
      vrs.v,
      vrs.r,
      vrs.s
    );
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
      `Redeem: ${from} to: ${to} with amount: ${swapAmount} and nonce: ${nonceValue}`
    );
    await Transaction.findOneAndUpdate(
      { nonce: nonceValue },
      { nonceUsed: true }
    );
  });
