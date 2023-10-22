import { task } from "hardhat/config";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { Address } from "cluster";

task("tokenApprove", "Approve spender to spend tokens")
  .addParam("spender", "Address of the spender")
  .addParam("value", "Amount of tokens to approve")
  .addParam("token", "Address of the token")
  .setAction(async ({ spender, value, token }, { ethers }) => {
    const Token = await ethers.getContractFactory("MyToken");
    const tokenContract = Token.attach(token!);

    const approveTx: ContractTransaction = await tokenContract.approve(
      spender,
      value
    );
    const approveReceipt: ContractReceipt = await approveTx.wait();
    const event = approveReceipt.events?.find(
      (event) => event.event === "Approval"
    );
    const eInitiator: Address = event?.args!["owner"];
    const eSpender: Address = event?.args!["spender"];
    const eAmount: BigNumber = event?.args!["value"];
    console.log(`Initiator: ${eInitiator}`);
    console.log(`Spender: ${eSpender}`);
    console.log(`Amount: ${eAmount}`);
  });
