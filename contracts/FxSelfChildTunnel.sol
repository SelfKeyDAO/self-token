// SPDX-License-Identifier: proprietary
pragma solidity 0.8.19;

import "@maticnetwork/fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "./ISelfToken.sol";

/**
 * @title FxSelfChildTunnel
 */
contract FxSelfChildTunnel is FxBaseChildTunnel {
    uint256 public latestStateId;
    address public latestRootMessageSender;
    bytes public latestData;
    ISelfToken public token;

    constructor(address _fxChild, address _tokenAddress) FxBaseChildTunnel(_fxChild) {
        token = ISelfToken(_tokenAddress);
        require(_isContract(_tokenAddress), "Token address is not contract");
    }

    function _processMessageFromRoot(uint256 stateId, address sender, bytes memory data) internal override validateSender(sender) {
        latestStateId = stateId;
        latestRootMessageSender = sender;
        latestData = data;

        // abi.encode(address, uint256)
        (address account, uint256 amount) = abi.decode(data, (address, uint256));
        token.mint(account, amount);
    }

    function bridge(uint256 amount) public {
        token.burnFrom(msg.sender, amount);
        bytes memory message = abi.encode(msg.sender, amount);
        _sendMessageToRoot(message);
    }

    function sendMessageToRoot(bytes memory message) public {
        _sendMessageToRoot(message);
    }

    // check if address is contract
    function _isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}
