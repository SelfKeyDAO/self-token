// SPDX-License-Identifier: proprietary
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ISelfkeyMintableRegistry.sol";
import "../external/ISelfkeyPoiLock.sol";

struct RewardEntry {
    uint256 timestamp;
    uint amount;
    string task;
    uint task_id;
    address signer;
}

struct MintingEntry {
    uint256 timestamp;
    uint amount;
}

contract SelfkeyMintableRegistry is Initializable, OwnableUpgradeable, ISelfkeyMintableRegistry {

    address public authorizedSigner;
    mapping(address => RewardEntry[]) private _rewardEntries;
    mapping(address => MintingEntry[]) private _mintingEntries;

    // an array of authorized addresses
    mapping(address => bool) public authorizedCallers;

    ISelfkeyPoiLock public poiLockContract;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Ownable_init();
    }

    function changeAuthorizedSigner(address _signer) public onlyOwner {
        require(_signer != address(0), "Invalid authorized signer");
        authorizedSigner = _signer;
        emit AuthorizedSignerChanged(_signer);
    }

    function registerReward(address _account, uint256 _amount, string memory _task, uint _task_id, address _signer) external {
        require(authorizedSigner == msg.sender, "Not authorized to register");
        _rewardEntries[_account].push(RewardEntry(block.timestamp, _amount, _task, _task_id, _signer));
        emit RewardRegistered(_account, _amount, _task, _task_id);
    }

    function registerMinting(address _account, uint256 _amount) external onlyAuthorizedCallerOrSigner {
        require(balanceOf(_account) >= _amount, "Not enough balance");
        _mintingEntries[_account].push(MintingEntry(block.timestamp, _amount));
        emit MintingRegistered(_account, _amount);
    }

    function balanceOfEarned(address _account) public view returns(uint) {
        uint _balance = 0;
        RewardEntry[] memory _accountRecords = _rewardEntries[_account];
        for(uint i=0; i<_accountRecords.length; i++) {
            RewardEntry memory _record = _accountRecords[i];
            if (_record.timestamp <= block.timestamp) {
                _balance = _balance + _record.amount;
            }
        }
        return _balance;
    }

    function balanceOfMinted(address _account) public view returns(uint) {
        uint _balance = 0;
        MintingEntry[] memory _accountRecords = _mintingEntries[_account];
        for(uint i=0; i<_accountRecords.length; i++) {
            MintingEntry memory _record = _accountRecords[i];
            if (_record.timestamp <= block.timestamp) {
                _balance = _balance + _record.amount;
            }
        }
        return _balance;
    }

    function balanceOfStaking(address _account) public view returns(uint) {
        if (address(poiLockContract) == address(0)) {
            return 0;
        }
        return poiLockContract.earned(_account);
    }

    function balanceOf(address _account) public view returns(uint) {
        return balanceOfEarned(_account) + balanceOfStaking(_account) - balanceOfMinted(_account);
    }

    function isContract(address _addr) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    modifier onlyAuthorizedCaller() {
        require(authorizedCallers[msg.sender] && isContract(msg.sender), "Not an authorized caller");
        _;
    }

    function addAuthorizedCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = true;
        emit AuthorizedCallerAdded(_caller);
    }

    function removeAuthorizedCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = false;
        emit AuthorizedCallerRemoved(_caller);
    }

    function register(address _account, uint256 _amount, string memory _task, uint _task_id, address _signer) external onlyAuthorizedCaller {
        _rewardEntries[_account].push(RewardEntry(block.timestamp, _amount, _task, _task_id, _signer));
        emit RewardRegistered(_account, _amount, _task, _task_id);
    }

    modifier onlyAuthorizedCallerOrSigner() {
        require((authorizedCallers[msg.sender] && isContract(msg.sender)) || authorizedSigner == msg.sender, "Not an authorized caller or signer");
        _;
    }

    function setPoiLockContract(address _poiLockContractAddress) external onlyOwner {
        require(_poiLockContractAddress != address(0), "Invalid POI Lock contract");
        poiLockContract = ISelfkeyPoiLock(_poiLockContractAddress);
        emit PoiLockContractChanged(_poiLockContractAddress);
    }
}
