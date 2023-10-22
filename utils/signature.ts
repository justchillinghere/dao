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
