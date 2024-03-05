// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISelfToken {
    // ERC20 standard functions
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // Additional functions
    function authorizationContractAddress() external view returns (address);
    function paused() external view returns (bool);
    function authorizedCallers(address caller) external view returns (bool);

    // Events
    event AuthorizationContractChanged(address indexed authorizationContractAddress);
    event Paused(address account);
    event Unpaused(address account);
    event AuthorizedCallerAdded(address indexed caller);
    event AuthorizedCallerRemoved(address indexed caller);

    // Pausing functions
    function pause() external;
    function unpause() external;

    // Minting functions
    function selfMint(uint256 amount, bytes32 param, uint timestamp, address signer, bytes calldata signature) external;
    function mint(address to, uint256 amount) external;

    // Burning function
    function burnFrom(address account, uint256 amount) external;

    // Authorization contract functions
    function setAuthorizationContract(address authorizationContractAddress) external;

    // Authorized caller functions
    function addAuthorizedCaller(address caller) external;
    function removeAuthorizedCaller(address caller) external;
}
