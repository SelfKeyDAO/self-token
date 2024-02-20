const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SELF token Tests", function () {

	let contract;
    let authContract;
    let votingContract;
    let governanceContract;
    let mintableRegistryContract;

    let _amount = 100;

    let owner;
    let addr1;
    let addr2;
    let receiver;
    let signer;
    let addrs;

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {
        [owner, addr1, addr2, receiver, signer, ...addrs] = await ethers.getSigners();

        let authorizationContractFactory = await ethers.getContractFactory("SelfkeyIdAuthorization");
        authContract = await authorizationContractFactory.deploy(signer.address);

        let votingContractFactory = await ethers.getContractFactory("SelfkeyDaoVoting");
        votingContract = await upgrades.deployProxy(votingContractFactory, [authContract.address]);
        await votingContract.deployed();
        await votingContract.connect(owner).createProposal("SELF Unlock", true, { from: owner.address });

        let governanceContractFactory = await ethers.getContractFactory("SelfkeyGovernance");
        governanceContract = await upgrades.deployProxy(governanceContractFactory, []);
        await governanceContract.deployed();
        // Setup self unlock governance limits
        await governanceContract.connect(owner).setDaoVotingContractAddress(votingContract.address, { from: owner.address });
        await governanceContract.connect(owner).setNumber(0, 1, { from: owner.address });
        await governanceContract.connect(owner).setNumber(1, 1, { from: owner.address });

        let mintableRegistryFactory = await ethers.getContractFactory("SelfkeyMintableRegistry");
        mintableRegistryContract = await upgrades.deployProxy(mintableRegistryFactory, []);
        await mintableRegistryContract.deployed();
        await mintableRegistryContract.connect(owner).changeAuthorizedSigner(signer.address, { from: owner.address });

        let selfTokenContractFactory = await ethers.getContractFactory("SelfToken");
        contract = await upgrades.deployProxy(selfTokenContractFactory, []);
        await contract.deployed();

        await contract.connect(owner).setAuthorizationContract(authContract.address, { from: owner.address });
        await contract.connect(owner).setGovernanceContractAddress(governanceContract.address, { from: owner.address });
        await contract.connect(owner).setMintableRegistryContractAddress(mintableRegistryContract.address, { from: owner.address });

        // Allow SELF contract to register a minting event in the mintable registry
        await mintableRegistryContract.connect(owner).addAuthorizedCaller(contract.address, { from: owner.address });
        // Register some un-minted SELF
        await mintableRegistryContract.connect(signer).registerReward(addr2.address, _amount, 'Test', 1, signer.address, { from: signer.address });

    });

    describe("Upgradeable", function() {
        it("Can upgrade from V1", async function() {
            let factory = await ethers.getContractFactory("SelfTokenV1");
            let contractV1 = await upgrades.deployProxy(factory, []);
            await contractV1.deployed();

            let factory2 = await ethers.getContractFactory("SelfToken");
            const upgradedContract = await upgrades.upgradeProxy(contractV1.address, factory2);

            await expect(upgradedContract.connect(owner).addAuthorizedCaller(signer.address, { from: owner.address }))
                .to.emit(upgradedContract, 'AuthorizedCallerAdded').withArgs(signer.address);
        });
    });

    describe("Deployment", function() {
        it("Deployed correctly and Selfkey.ID authorization contract was set", async function() {

            expect(await contract.symbol()).to.equal('SELF');
            expect(await contract.authorizationContractAddress()).to.equal(authContract.address);
        });

        it("Unlock proposal should be set", async function() {
            const proposal = await votingContract.proposals(1);
            expect(proposal.title).to.equal("SELF Unlock");
        });

        it("Test account has some non-minted SELF", async function() {
            expect(await mintableRegistryContract.balanceOf(addr2.address)).to.equal(_amount);
        });
    });

    describe("Governance functions", function() {
        it("Owner should be able to mint", async function() {
            const _amount = 100;
            await expect(contract.connect(owner).mint(addr1.address, _amount, { from: owner.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);
        });

        it("Non-owner should not be able to mint", async function() {
            const _amount = 100;
            await expect(contract.connect(addr1).mint(addr1.address, _amount, { from: addr1.address }))
                .to.be.revertedWith('Not an authorized caller or owner');

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Owner address can pause", async function() {
            expect(await contract.paused()).to.equal(false);

            await expect(contract.connect(owner).pause({ from: owner.address }))
                .to.emit(contract, 'Paused')

            expect(await contract.paused()).to.equal(true);
        });

        it("When paused owner cannot mint", async function() {
            expect(await contract.paused()).to.equal(false);

            await expect(contract.connect(owner).pause({ from: owner.address }))
                .to.emit(contract, 'Paused')

            expect(await contract.paused()).to.equal(true);

            const _amount = 100;
            await expect(contract.connect(owner).mint(addr1.address, _amount, { from: owner.address }))
                .to.be.revertedWith('Pausable: paused');
        });

        it("When paused transfers are allowed", async function() {
            const _amount = 100;

            expect(await contract.paused()).to.equal(false);

            await expect(contract.connect(owner).mint(addr1.address, _amount, { from: owner.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            await expect(contract.connect(owner).pause({ from: owner.address }))
                .to.emit(contract, 'Paused')

            expect(await contract.paused()).to.equal(true);

            await expect(contract.connect(addr1).transfer(addr2.address, _amount, { from: addr1.address }))
                .to.emit(contract, 'Transfer');

            expect(await contract.balanceOf(addr2.address)).to.equal(_amount);

            await expect(contract.connect(owner).mint(addr1.address, _amount, { from: owner.address }))
                .to.be.revertedWith('Pausable: paused');
        });

    })

    describe("Authorized minting", function() {

        it("Cannot mint SELF if authorization payload fails", async function() {
            let _from = contract.address;
            let _to = addr1.address;
            let _mintAmount = 10;
            let _scope = 'mint:self:invalid';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(0, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _mintAmount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _mintAmount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_mintAmount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Verification failed");

                /*
            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);
            */
        });

        it("Cannot mint SELF if minting is locked", async function() {
            let _from = contract.address;
            let _to = addr1.address;
            let _mintAmount = 10;
            let _scope = 'mint:self';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(0, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _mintAmount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _mintAmount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_mintAmount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Self minting is locked");
        });

        it("Cannot mint SELF if asking for more than balance", async function() {
            let _from = votingContract.address;
            let _to = addr1.address;
            let _amount = 1;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(votingContract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(votingContract, 'VoteCast')
                .withArgs(1, addr1.address, _amount);

            const voteCount = await votingContract.getVoteCount(1);
            const hasVoted = await votingContract.hasUserVoted(1, addr1.address);
            expect(voteCount.toNumber()).to.equal(1);
            expect(hasVoted).to.be.true;

            _from = contract.address;
            _to = addr1.address;
            _mintAmount = 10;
            _scope = 'mint:self';
            _timestamp = await time.latest();
            _param = ethers.utils.hexZeroPad(0, 32);

            // Lock 10 KEY for addr1
            hash = await authContract.getMessageHash(_from, _to, _mintAmount, _scope, _param, _timestamp);
            signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _mintAmount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_mintAmount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Not enough balance in minting registry");
        });


        it("Can mint SELF", async function() {
            let _from = votingContract.address;
            let _to = addr1.address;
            let _amount = 1;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(votingContract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(votingContract, 'VoteCast')
                .withArgs(1, addr1.address, _amount);

            const voteCount = await votingContract.getVoteCount(1);
            const hasVoted = await votingContract.hasUserVoted(1, addr1.address);
            expect(voteCount.toNumber()).to.equal(1);
            expect(hasVoted).to.be.true;

            _from = contract.address;
            _to = addr2.address;
            _mintAmount = 10;
            _scope = 'mint:self';
            _timestamp = await time.latest();
            _param = ethers.utils.hexZeroPad(0, 32);

            // Lock 10 KEY for addr1
            hash = await authContract.getMessageHash(_from, _to, _mintAmount, _scope, _param, _timestamp);
            signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _mintAmount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr2).selfMint(_mintAmount, _param, _timestamp, signer.address, signature, { from: addr2.address }))
                .to.emit(contract, "Transfer");

            const balanceSELF = await contract.balanceOf(addr2.address);
            expect(balanceSELF).to.equal(_mintAmount);

            const mintableBalance = await mintableRegistryContract.balanceOf(addr2.address);
            expect(mintableBalance).to.equal(90);
        });

        /*
        it("Should be able to mint SELF if authorized", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);
        });

        it("Should be able to mint SELF if authorized only once", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith('Payload already used');

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);
        });

        it("Should NOT be able to mint SELF if authorized but asked for wrong amount", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_to, 100, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith('Verification failed');

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Should NOT be able to mint SELF if authorized but asked for wrong wallet address", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(addr2.address, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Invalid subject");

            expect(await contract.balanceOf(addr2.address)).to.equal(0);
        });

        it("Should NOT be able to mint SELF if authorized for different scope", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(addr1.address, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Verification failed");

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Should NOT be able to mint SELF if authorized from an untrusted signer", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await addr2.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, addr2.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(addr1.address, _amount, _timestamp, addr2.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Invalid signer");

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Should NOT be able to mint SELF if authorized more than 4 hours ago", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await addr2.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, addr2.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(addr1.address, _amount, _timestamp, addr2.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Invalid signer");

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Should be able to burn own SELF", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith('Payload already used');

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr1).burn(_amount, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(addr1.address, ZERO_ADDRESS, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Should not be able to burn others SELF", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith('Payload already used');

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr2).burnFrom(addr1.address, _amount, { from: addr2.address }))
                .to.be.revertedWith('ERC20: insufficient allowance');

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);
        });

        it("Should be able to burn others SELF with allowance", async function() {
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 10;
            const _scope = 'mint:self';
            const _timestamp = expiration;

            const hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            expect(await authContract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr1).selfMint(_to, _amount, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith('Payload already used');

            expect(await contract.balanceOf(addr1.address)).to.equal(_amount);

            await expect(contract.connect(addr1).approve(addr2.address, _amount), { from: addr1.address })
                .to.emit(contract, 'Approval')
                .withArgs(addr1.address, addr2.address, _amount);

            await expect(contract.connect(addr2).burnFrom(addr1.address, _amount, { from: addr2.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(addr1.address, ZERO_ADDRESS, _amount);

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });
        */
    });
});