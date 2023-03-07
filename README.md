# Gelato Bots NFT

## Summary

NFT powered by Open AI & Web3 functions:
- User can mint a new NFT every day
- A Web3 function is listening to every new mint and generate a new art using Open Ai (Dall-E)
- The NFT pic is published on IPFS and revealed on-chain via Gelato Automate

## Demo
- Goerli:
 - Smart Contract: https://goerli.etherscan.io/address/0x83503675b4dc70321db99b62170507434c4d3d06
 - Web3 Function: https://beta.app.gelato.network/task/0x63353c5c60041fe273a9024837c6f3be3f5fbf1733f5a04d12a30d56f232a55f?chainId=5 
 - Open Sea NFTs: https://testnets.opensea.io/collection/gelato-bots
 - LooksRare NFT collection: https://goerli.looksrare.org/collections/0x83503675b4dC70321DB99b62170507434C4D3d06

## How to run

1. Install project dependencies:
```
yarn install
```

2. Create a `.env` file with your private config:
```
cp .env.example .env
```

3. Test the Open AI NFT web3 function on goerli:
```
npx w3f test web3-functions/open-ai-nft/index.ts --show-logs --user-args=nftAddress:0x83503675b4dC70321DB99b62170507434C4D3d06
```

## Deploy your smart contract and web3 function
```
yarn run deploy --network goerli
```

## Verify
```
npx hardhat verify CONTRACT_ADDRESS DEDICATED_MSG_SENDER
```