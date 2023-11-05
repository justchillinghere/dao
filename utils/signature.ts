import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

export function generateMessage(
  senderAddress: string,
  recipientAddress: string,
  amount: BigNumber,
  nonce: BigNumber,
  initChainId: BigNumber,
  destChainId: BigNumber
): string {
  return ethers.utils.solidityKeccak256(
    ["address", "address", "uint256", "uint256", "uint8", "uint8"],
    [senderAddress, recipientAddress, amount, nonce, initChainId, destChainId]
  );
}

export async function signMessage(
  message: string,
  signer: SignerWithAddress
): Promise<string> {
  return await signer.signMessage(ethers.utils.arrayify(message));
}

export function splitSignature(signature: string): {
  v: number;
  r: string;
  s: string;
} {
  return ethers.utils.splitSignature(signature);
}

export function encodeFunctionCall(
  functionName: string,
  types: Array<string>,
  args: Array<string | number>
): string {
  const functionSignature = `${functionName}(${types.join(",")})`;
  const functionSelector = ethers.utils.id(functionSignature).slice(0, 10);
  const encodedArgs = ethers.utils.defaultAbiCoder.encode(types, args);
  const data = functionSelector + encodedArgs.slice(2);

  return data;
}
