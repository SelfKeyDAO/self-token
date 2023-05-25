const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

function getTimestamp() {
    const today = new Date();
    const mseconds = today.getTime();
    const seconds = Math.floor(mseconds / 1000);
    const dateInSecs = Math.floor(new Date().getTime() / 1000);
    return dateInSecs;
}

describe("Selkey.ID Authorization Tests", function () {

    let contract;

    let owner;
    let addr1;
    let addr2;
    let receiver;
    let signer;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, receiver, signer, ...addrs] = await ethers.getSigners();

        let authorizationContractFactory = await ethers.getContractFactory("SelfkeyIdAuthorization");
        contract = await authorizationContractFactory.deploy(signer.address);
    });

    describe("Deployment", function() {
        it("Deployed correctly and authorized signer was assigned", async function() {
            expect(await contract.authorizedSigner()).to.equal(signer.address);
        });
    });

    describe("Signing", function() {
        it("Can sign and verify payloads", async function() {
            const signer = addr1;
            const _from = contract.address;
            const _amount = 10;
            const _to = addr2.address;
            const _scope = 'mint';
            const _timestamp = getTimestamp();

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash));
            const ethHash = await contract.getEthSignedMessageHash(hash);

            const recoverSigner = await contract.recoverSigner(ethHash, signature);
            expect(signer.address).to.equal(recoverSigner);
            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);
        });
    });

    describe("Authorization", function() {
        let expiration;
        it("Should create a deadline in seconds based on last block timestamp", async function () {
            const provider = ethers.getDefaultProvider()
            const lastBlockNumber = await provider.getBlockNumber()
            const lastBlock = await provider.getBlock(lastBlockNumber)
            expiration = lastBlock.timestamp;
        });

        it("Payload is accepted", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);
            await expect(contract.connect(addr1).authorize(_from, _to, _amount, _scope, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'PayloadAuthorized').withArgs(_from, _to, _amount);
        });

        it("Payload is not accepted if signer is not trusted", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await addr1.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, addr1.address, signature)).to.equal(true);
            await expect(contract.connect(addr1).authorize(_from, _to, _amount, _scope, _timestamp, addr1.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Invalid signer");
        });


        it("Payload is not accepted if executed by different wallet", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);
            await expect(contract.connect(addr2).authorize(_from, _to, _amount, _scope, _timestamp, signer.address, signature, { from: addr2.address }))
                .to.be.revertedWith("Invalid caller");
        });

        it("Payload is not accepted if repeated", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).authorize(_from, _to, _amount, _scope, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'PayloadAuthorized').withArgs(_from, _to, _amount);

            await expect(contract.connect(addr1).authorize(_from, _to, _amount, _scope, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Payload already used");
        });

        it("Payload is not accepted if different scope", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).authorize(_from, _to, _amount, 'different', _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Verification failed");
        });

        it("Payload is not accepted if different amount", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).authorize(_from, _to, 20, _scope, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Verification failed");
        });

        it("Payload is not accepted if different destination wallet", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).authorize(_from, addr2.address, 20, _scope, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Invalid subject");
        });

        it("Payload is not accepted if more than 4 hours", async function() {
            const _from = addr1.address;
            const _amount = 10;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration - 4 * 60 * 60;

            const hash = await contract.getMessageHash(_from, _to, _amount, _scope, _timestamp);
            const signature = await signer.signMessage(ethers.utils.arrayify(hash))

            expect(await contract.verify(_from, _to, _amount, _scope, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).authorize(_from, _to, _amount, _scope, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Invalid timestamp");
        });
    });
});
