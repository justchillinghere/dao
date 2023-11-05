import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { chainIds } from "../hardhat.config";
import { MyDAO, MyDAO__factory, MyToken, MyToken__factory } from "../src/types";
import { encodeFunctionCall } from "../utils/signature";

async function shiftTime(newTime: number | string) {
  await ethers.provider.send("evm_increaseTime", [newTime]);
  await ethers.provider.send("evm_mine", []);
}

describe("Test DAO contract", function () {
  let contractDAO: MyDAO;
  let MyDAOFactory: MyDAO__factory;
  let govToken: MyToken;

  let owner: SignerWithAddress,
    chairperson: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    users: SignerWithAddress[];

  let voteAmount: BigNumber = ethers.utils.parseUnits("25", 6);
  let userBalance: BigNumber = ethers.utils.parseUnits("10", 18);
  let minProposalDuration: number;
  let quorum: number;
  let proposalEndTime: number;
  const transferAmount = ethers.utils.parseUnits("100", 6);
  let testCallFucntionData: string;
  const voteType = { disagreed: false, agreed: true };

  beforeEach(async () => {
    [owner, chairperson, user1, user2, ...users] = await ethers.getSigners();
    minProposalDuration = 1000;
    quorum = 2;
    proposalEndTime = (await time.latest()) + minProposalDuration * 2;

    const TokenFactory = (await ethers.getContractFactory(
      "MyToken"
    )) as MyToken__factory;
    govToken = await TokenFactory.deploy("govToken", "GTK");
    MyDAOFactory = (await ethers.getContractFactory("MyDAO")) as MyDAO__factory;
    contractDAO = await MyDAOFactory.deploy(
      chairperson.address,
      govToken.address,
      minProposalDuration,
      quorum
    );

    await govToken.grantRole(await govToken.MINTER_ROLE(), owner.address);
    for (const acc of [owner, chairperson, user1, user2]) {
      await govToken.mint(acc.address, userBalance);
      await govToken.connect(acc).approve(contractDAO.address, voteAmount);
    }

    testCallFucntionData = encodeFunctionCall(
      "transfer",
      ["address", "uint256"],
      [user1.address, transferAmount.toString()]
    );
  });
  describe("Test addProposal and deposit features", function () {
    it("Should have correct parameters after construction", async function () {
      expect(
        await contractDAO.hasRole(
          await contractDAO.CHAIRPERSON_ROLE(),
          chairperson.address
        )
      ).to.be.true;
      expect(await contractDAO.govToken()).to.equal(govToken.address);
      expect(await contractDAO.minProposalDuration()).to.equal(
        minProposalDuration
      );
      expect(await contractDAO.minQuorum()).to.equal(quorum);
    });
    it("Should allow chairperson to create proposal and emit an event", async function () {
      const chairpersonConnect = contractDAO.connect(chairperson);
      await expect(
        chairpersonConnect.addProposal(
          govToken.address,
          "test description",
          testCallFucntionData
        )
      )
        .to.emit(contractDAO, "ProposalAdded")
        .withArgs(1, govToken.address, "test description");
    });
    it("Should deposit tokens with correct balance and emit an event", async function () {
      const user1Balance = await contractDAO.getAvailableVotes(user1.address);
      expect(await contractDAO.connect(user1).deposit(voteAmount))
        .to.emit(contractDAO, "Deposited")
        .withArgs(user1.address, voteAmount);
      expect(await contractDAO.getAvailableVotes(user1.address)).to.equal(
        user1Balance.add(voteAmount)
      );
    });
  });
  describe("Test vote feature", function () {
    beforeEach(async () => {
      await contractDAO
        .connect(chairperson)
        .addProposal(
          govToken.address,
          "test description",
          testCallFucntionData
        );
    });
    it("Should allow to vote and emit an event", async function () {
      contractDAO.connect(user1).deposit(voteAmount);
      expect(await contractDAO.connect(user1).vote(1, voteType.agreed)).to.emit(
        contractDAO,
        "Voted"
      );
    });
    it("Should fail to vote without deposit", async function () {
      await expect(
        contractDAO.connect(user1).vote(1, voteType.agreed)
      ).to.be.revertedWith("MyDAO: Not enough votes");
    });
    it("Should fail to vote with wrong proposal id", async function () {
      await contractDAO.connect(user1).deposit(voteAmount);
      await expect(
        contractDAO.connect(user1).vote(2, voteType.agreed)
      ).to.be.revertedWith("MyDAO: Invalid proposalId");
    });
    it("Should fail to vote more than once", async function () {
      await contractDAO.connect(user1).deposit(voteAmount);
      await contractDAO.connect(user1).vote(1, voteType.agreed);
      await expect(
        contractDAO.connect(user1).vote(1, voteType.agreed)
      ).to.be.revertedWith("MyDAO: User has already voted for this proposal");
    });
    it("Should fail to vote after finishing the debates", async function () {
      for (const acc of [owner, chairperson, user1]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.agreed);
      }
      await contractDAO.connect(user2).deposit(voteAmount);

      await shiftTime(proposalEndTime);
      await contractDAO.connect(chairperson).finishProposal(1);
      await expect(
        contractDAO.connect(user2).vote(1, voteType.agreed)
      ).to.be.revertedWith("MyDAO: Voting period has ended");
    });
  });
  describe("Test finishProposal feature", function () {
    beforeEach(async () => {
      await contractDAO
        .connect(chairperson)
        .addProposal(
          govToken.address,
          "test description",
          testCallFucntionData
        );
    });
    it("Should allow to finish proposal and emit an event of proposal acceptance", async function () {
      for (const acc of [owner, chairperson, user1, user2]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.agreed);
      }
      await shiftTime(proposalEndTime);
      expect(await contractDAO.connect(chairperson).finishProposal(1))
        .to.emit(contractDAO, "ProposalFinished")
        .withArgs(1, true);
    });
    it("Should allow to finish proposal and emit an event of proposal denial", async function () {
      for (const acc of [owner, chairperson, user1, user2]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.disagreed);
      }
      await shiftTime(proposalEndTime);
      expect(await contractDAO.connect(chairperson).finishProposal(1))
        .to.emit(contractDAO, "ProposalFinished")
        .withArgs(1, false);
    });
    it("Should fail to finish proposal with bad id", async function () {
      for (const acc of [owner, chairperson, user1, user2]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.agreed);
      }
      await shiftTime(proposalEndTime);
      await expect(
        contractDAO.connect(chairperson).finishProposal(2)
      ).to.be.revertedWith("MyDAO: Invalid proposalId");
    });
    it("Should fail to finish proposal for not a chairperson", async function () {
      for (const acc of [owner, chairperson, user1, user2]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.agreed);
      }
      await shiftTime(proposalEndTime);
      await expect(
        contractDAO.connect(user1).finishProposal(1)
      ).to.be.revertedWith("MyDAO: You cannot finish this proposal");
    });
    it("Should fail to finish proposal before min duration", async function () {
      for (const acc of [owner, chairperson, user1, user2]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.agreed);
      }
      await expect(
        contractDAO.connect(chairperson).finishProposal(1)
      ).to.be.revertedWith("MyDAO: Voting period has not ended yet");
    });
    it("Should fail to finish proposal more than once", async function () {
      for (const acc of [owner, chairperson, user1, user2]) {
        await contractDAO.connect(acc).deposit(voteAmount);
        await contractDAO.connect(acc).vote(1, voteType.agreed);
      }
      await shiftTime(proposalEndTime);
      await contractDAO.connect(chairperson).finishProposal(1);
      await expect(
        contractDAO.connect(chairperson).finishProposal(1)
      ).to.be.revertedWith("MyDAO: Proposal has already been finished");
    });
    it("Should fail to finish proposal if quorum not gathered", async function () {
      await shiftTime(proposalEndTime);
      await expect(
        contractDAO.connect(chairperson).finishProposal(1)
      ).to.be.revertedWith("MyDAO: Quorum has not been reached");
    });
  });
});
