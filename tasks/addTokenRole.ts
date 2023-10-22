import { task } from "hardhat/config";
import { ContractTransaction, ContractReceipt, BytesLike } from "ethers";
import { Address } from "cluster";

task(
  "addTokenRole",
  "add role to the token contract. If no address is provided, the address of the signer is used"
)
  .addParam("token", "address of the token contract")
  .addParam("role", "role to add")
  .addOptionalParam("addAddress", "address to add to the role")
  .setAction(async ({ token, role, addAddress }, { ethers }) => {
    const Token = await ethers.getContractFactory("MyToken");
    const tokenContract = Token.attach(token!);

    const roleToAdd: string =
      role === "burner"
        ? await tokenContract.BURNER_ROLE()
        : await tokenContract.MINTER_ROLE();
    addAddress = addAddress || (await ethers.provider.getSigner().getAddress());
    const tx: ContractTransaction = await tokenContract.grantRole(
      roleToAdd,
      addAddress
    );
    const approveReceipt: ContractReceipt = await tx.wait();
    const event = approveReceipt.events?.find(
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
