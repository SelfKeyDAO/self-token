// SPDX-License-Identifier: proprietary
pragma solidity 0.8.19;

import "@maticnetwork/fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import "./ISelfToken.sol";

/**
 * @title FxSelfRootTunnel
 */
contract FxSelfRootTunnel is FxBaseRootTunnel {
    bytes public latestData;
    ISelfToken public token;

    constructor(address _checkpointManager, address _fxRoot, address _tokenAddress) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        token = ISelfToken(_tokenAddress);
        require(_isContract(_tokenAddress), "Token address is not contract");
    }

    function _processMessageFromChild(bytes memory data) internal override {
        latestData = data;
        // abi.encode(address, uint256)
        (address account, uint256 amount) = abi.decode(latestData, (address, uint256));
        token.mint(account, amount);
    }

    function bridge(uint256 amount) public {
        token.burnFrom(msg.sender, amount);
        bytes memory message = abi.encode(msg.sender, amount);
        _sendMessageToChild(message);
    }


    function sendMessageToChild(bytes memory message) public {
        _sendMessageToChild(message);
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
