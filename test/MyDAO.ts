import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { chainIds } from "../hardhat.config";
import { MyDAO, MyDAO__factory, MyToken, MyToken__factory } from "../src/types";

describe("Test Bridge contract", function () {
  let contractDAO: MyDAO;
  let MyDAOFactory: MyDAO__factory;
  let govToken: MyToken;

  let owner: SignerWithAddress,
    chairperson: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    users: SignerWithAddress[];

  let amount: BigNumber;
  let minProposalDuration: number;
  let quorum: number;
  const voteType = { disagreed: false, agreed: true };

  beforeEach(async () => {
    [owner, chairperson, user1, user2, ...users] = await ethers.getSigners();
    amount = ethers.utils.parseUnits("25", 6);

    // Create tokens for ICO
    const TokenFactory = (await ethers.getContractFactory(
      "MyToken"
    )) as MyToken__factory;
    govToken = await TokenFactory.deploy("govToken", "GTK");

    // Create ICO factory
    MyDAOFactory = (await ethers.getContractFactory("MyDAO")) as MyDAO__factory;
  });
  describe("Test bridge features", function () {
    minProposalDuration = 100;
    quorum = 2;
    beforeEach(async () => {
      contractDAO = await MyDAOFactory.deploy(
        chairperson.address,
        govToken.address,
        minProposalDuration,
        quorum
      );
    });
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
      const tx = await chairpersonConnect.addProposal(
        govToken.address,
        "test description",
        amount
      );
    });
  });
});
