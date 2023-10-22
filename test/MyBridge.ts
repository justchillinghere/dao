import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { chainIds } from "../hardhat.config";
import {
  MyBridge,
  MyBridge__factory,
  MyToken,
  MyToken__factory,
} from "../src/types";
import {
  generateMessage,
  signMessage,
  splitSignature,
} from "../utils/signature";

async function swapAndRedeem(
  sender: SignerWithAddress,
  recipient: SignerWithAddress,
  amount: BigNumber,
  initChainId: BigNumber,
  destChainId: BigNumber,
  contractETH: MyBridge,
  contractBSC: MyBridge,
  signer: SignerWithAddress
): Promise<void> {
  await contractETH.connect(sender).swap(recipient.address, amount);
  const nonce = await contractETH.nonce();
  const message = generateMessage(
    sender.address,
    recipient.address,
    amount,
    nonce,
    initChainId,
    destChainId
  );
  const signature = await signMessage(message, signer);
  const vrs = splitSignature(signature);
  await contractBSC
    .connect(recipient)
    .redeem(
      sender.address,
      recipient.address,
      amount,
      nonce,
      initChainId,
      destChainId,
      vrs.v,
      vrs.r,
      vrs.s
    );
}

describe("Test Bridge contract", function () {
  let contractETH: MyBridge;
  let contractBSC: MyBridge;
  let MyBridgeFactory: MyBridge__factory;
  let ethToken: MyToken;

  let signer: SignerWithAddress,
    sender: SignerWithAddress,
    recipient: SignerWithAddress,
    users: SignerWithAddress[];

  let amount: BigNumber;
  let nonce: BigNumber;
  const initChainId: BigNumber = BigNumber.from(chainIds.mainnet);
  const destChainId: BigNumber = BigNumber.from(chainIds.bsc);
  const transferType = { swap: 0, redeem: 1 };

  beforeEach(async () => {
    [signer, sender, recipient, ...users] = await ethers.getSigners();
    amount = ethers.utils.parseUnits("25", 6);

    // Create tokens for ICO
    const TokenFactory = (await ethers.getContractFactory(
      "MyToken"
    )) as MyToken__factory;
    ethToken = await TokenFactory.deploy("ethToken", "ETH");

    // Create ICO factory
    MyBridgeFactory = (await ethers.getContractFactory(
      "MyBridge"
    )) as MyBridge__factory;
    contractETH = await MyBridgeFactory.deploy(ethToken.address);
    contractBSC = await MyBridgeFactory.deploy(ethToken.address);
  });
  describe("Test bridge features", function () {
    beforeEach(async () => {
      await ethToken.grantRole(await ethToken.MINTER_ROLE(), signer.address);
      await ethToken.mint(sender.address, amount);
      await ethToken.mint(recipient.address, amount);

      await ethToken.grantRole(
        await ethToken.BURNER_ROLE(),
        contractETH.address
      );
      await ethToken.grantRole(
        await ethToken.MINTER_ROLE(),
        contractBSC.address
      );
      await contractBSC.grantRole(
        await contractBSC.VALIDATOR_ROLE(),
        signer.address
      );
      await ethToken.approve(contractETH.address, amount);
      await ethToken.approve(contractBSC.address, amount);
    });
    it("Should have correct parameters after construction", async function () {
      expect(await contractETH.token()).to.equal(ethToken.address);
      expect(await contractBSC.token()).to.equal(ethToken.address);
      expect(
        await contractETH.hasRole(await ethToken.ADMIN_ROLE(), signer.address)
      ).to.equal(true);
      expect(
        await contractBSC.hasRole(await ethToken.ADMIN_ROLE(), signer.address)
      ).to.equal(true);
      expect(
        await contractBSC.hasRole(
          await contractBSC.VALIDATOR_ROLE(),
          signer.address
        )
      ).to.equal(true);
      expect(
        await ethToken.hasRole(
          await ethToken.MINTER_ROLE(),
          contractBSC.address
        )
      ).to.equal(true);
      expect(
        await ethToken.hasRole(
          await ethToken.BURNER_ROLE(),
          contractETH.address
        )
      ).to.equal(true);
    });
    it("Should mint and burn correct amount of money from the users", async function () {
      const senderPreviousAmount = await ethToken.balanceOf(sender.address);
      const recipientPreviousAmount = await ethToken.balanceOf(
        recipient.address
      );
      await swapAndRedeem(
        sender,
        recipient,
        amount,
        initChainId,
        destChainId,
        contractETH,
        contractBSC,
        signer
      );
      const senderAfterAmount = await ethToken.balanceOf(sender.address);
      const recipientAfterAmount = await ethToken.balanceOf(recipient.address);
      expect(senderAfterAmount).to.equal(senderPreviousAmount.sub(amount));
      expect(recipientAfterAmount).to.equal(
        recipientPreviousAmount.add(amount)
      );
    });
    it("Should emit events with correct parameters", async function () {
      await expect(contractETH.connect(sender).swap(recipient.address, amount))
        .to.emit(contractETH, "Transfer")
        .withArgs(
          sender.address,
          recipient.address,
          amount,
          await contractETH.nonce(),
          transferType.swap
        );
      nonce = await contractETH.nonce();
      let message = generateMessage(
        sender.address,
        recipient.address,
        amount,
        nonce,
        initChainId,
        destChainId
      );
      let signature = await signMessage(message, signer);
      let vrs = splitSignature(signature);
      await expect(
        contractBSC
          .connect(recipient)
          .redeem(
            sender.address,
            recipient.address,
            amount,
            nonce,
            initChainId,
            destChainId,
            vrs.v,
            vrs.r,
            vrs.s
          )
      )
        .to.emit(contractBSC, "Transfer")
        .withArgs(
          sender.address,
          recipient.address,
          amount,
          nonce,
          transferType.redeem
        );
    });
  });
  describe("Negative bridge tests", function () {
    beforeEach(async () => {
      await ethToken.grantRole(await ethToken.MINTER_ROLE(), signer.address);
      await ethToken.mint(sender.address, amount);
      await ethToken.mint(recipient.address, amount);

      await ethToken.grantRole(
        await ethToken.BURNER_ROLE(),
        contractETH.address
      );
      await ethToken.grantRole(
        await ethToken.MINTER_ROLE(),
        contractBSC.address
      );
      await ethToken.approve(contractETH.address, amount);
      await ethToken.approve(contractBSC.address, amount);
    });
    it("Should not allow to swap if the amount is 0", async function () {
      await expect(
        contractETH.connect(sender).swap(recipient.address, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
    it("Should not allow to redeem if signer is not validator", async function () {
      await contractETH.connect(sender).swap(recipient.address, amount);
      nonce = await contractETH.nonce();
      let message = generateMessage(
        sender.address,
        recipient.address,
        amount,
        nonce,
        initChainId,
        destChainId
      );
      let signature = await signMessage(message, recipient);
      let vrs = splitSignature(signature);
      await expect(
        contractBSC
          .connect(recipient)
          .redeem(
            sender.address,
            recipient.address,
            amount,
            nonce,
            initChainId,
            destChainId,
            vrs.v,
            vrs.r,
            vrs.s
          )
      ).to.be.revertedWith("Bridge: Invalid validator address or signature");
    });
    it("Should not allow to redeem if message is wrong", async function () {
      await contractBSC.grantRole(
        await contractBSC.VALIDATOR_ROLE(),
        signer.address
      );
      let message = generateMessage(
        recipient.address,
        recipient.address,
        amount,
        0,
        initChainId,
        destChainId
      );
      let signature = await signMessage(message, signer);
      let vrs = splitSignature(signature);
      await expect(
        contractBSC
          .connect(recipient)
          .redeem(
            sender.address,
            recipient.address,
            amount,
            0,
            initChainId,
            destChainId,
            vrs.v,
            vrs.r,
            vrs.s
          )
      ).to.be.revertedWith("Bridge: Invalid validator address or signature");
    });
    it("Should not allow to redeem with used nonce", async function () {
      await contractBSC.grantRole(
        await contractBSC.VALIDATOR_ROLE(),
        signer.address
      );
      await swapAndRedeem(
        sender,
        recipient,
        amount,
        initChainId,
        destChainId,
        contractETH,
        contractBSC,
        signer
      );
      let message = generateMessage(
        sender.address,
        recipient.address,
        amount,
        await contractETH.nonce(),
        initChainId,
        destChainId
      );
      let signature = await signMessage(message, signer);
      let vrs = splitSignature(signature);
      await expect(
        contractBSC
          .connect(recipient)
          .redeem(
            sender.address,
            recipient.address,
            amount,
            await contractETH.nonce(),
            initChainId,
            destChainId,
            vrs.v,
            vrs.r,
            vrs.s
          )
      ).to.be.revertedWith("Bridge: Nonce already used");
    });
  });
});
