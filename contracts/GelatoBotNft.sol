// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract GelatoBotNft is ERC721URIStorage, Ownable, Pausable  {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address public immutable gelatoMsgSender;
    string public constant notRevealedUri = "ipfs://bafyreicwi7sbomz7lu5jozgeghclhptilbvvltpxt3hbpyazz5zxvqh62m/metadata.json";
    mapping(address => bool) public hasMinted;

    event MetadataUpdate(uint256 _tokenId);


    constructor(address _gelatoMsgSender) ERC721("Gelato Bots", "GEL-BOT") {
        gelatoMsgSender = _gelatoMsgSender;
    }

    modifier onlyGelatoMsgSender() {
        require(msg.sender == gelatoMsgSender, "Only dedicated gelato msg.sender");
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function mint() external {
        require(!hasMinted[msg.sender], "Already minted!");
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, notRevealedUri);
        hasMinted[msg.sender] = true;
    }

    function revealNft(uint256 tokenId, string memory tokenURI) external onlyGelatoMsgSender {
        _setTokenURI(tokenId, tokenURI);
        emit MetadataUpdate(tokenId);
    }

}