const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("SELF token Tests", function () {

	let contract;
    let authContract;

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

		let selfTokenContractFactory = await ethers.getContractFactory("SelfToken");
        contract = await upgrades.deployProxy(selfTokenContractFactory, []);
		await contract.deployed();

        await contract.connect(owner).setAuthorizationContractAddress(authContract.address, { from: owner.address });

    });

    describe("Deployment", function() {
        it("Deployed correctly and Selfkey.ID authorization contract was set", async function() {

            expect(await contract.symbol()).to.equal('SELF');
            expect(await contract.authorizationContractAddress()).to.equal(authContract.address);
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
                .to.be.revertedWith('Ownable: caller is not the owner');

            expect(await contract.balanceOf(addr1.address)).to.equal(0);
        });

        it("Owner can pause", async function() {
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

    })

    describe("Authorized minting", function() {
        let expiration;
        it("Should create a deadline in seconds based on last block timestamp", async function () {
            const provider = ethers.getDefaultProvider()
            const lastBlockNumber = await provider.getBlockNumber()
            const lastBlock = await provider.getBlock(lastBlockNumber)
            expiration = lastBlock.timestamp;
        });

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

    });
});
