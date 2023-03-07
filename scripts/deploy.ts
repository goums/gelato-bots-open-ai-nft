/* eslint-disable @typescript-eslint/naming-convention */
import hre from "hardhat";
import { GelatoOpsSDK, isGelatoOpsSupported, TaskTransaction, Web3Function } from "@gelatonetwork/ops-sdk";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";

async function main() {
  const chainId = hre.network.config.chainId as number;
  if (!isGelatoOpsSupported(chainId)) {
    console.log(`Gelato Ops network not supported (${chainId})`);
    return;
  }

  // Init GelatoOpsSDK
  const [signer] = await hre.ethers.getSigners();
  const gelatoOps = new GelatoOpsSDK(chainId, signer);
  const dedicatedMsgSender = await gelatoOps.getDedicatedMsgSender();
  console.log(`Dedicated msg.sender: ${dedicatedMsgSender.address}`);

  // Deploying NFT contract
  const nftFactory = await hre.ethers.getContractFactory("GelatoBotNft");
  console.log("Deploying GelatoBotNft...");
  const gelatoBotNft = await nftFactory.deploy(dedicatedMsgSender.address);
  const { deployTransaction } = await gelatoBotNft.deployed();
  const genesisBlock = deployTransaction.blockNumber as number;

  //const gelatoBotNft = await nftFactory.attach("0x83503675b4dC70321DB99b62170507434C4D3d06");
  //const genesisBlock = 8550000;
  console.log(`GelatoBotNft deployed to: ${gelatoBotNft.address}`);
  console.log(`GelatoBotNft genesisBlock: ${genesisBlock}`);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const web3Function = "./web3-functions/open-ai-nft/index.ts";
  const cid = await Web3FunctionBuilder.deploy(web3Function);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Deploy Web3Functions secrets
  const secretsManager = new Web3Function(chainId, signer).secrets;
  await secretsManager.set({
    OPEN_AI_API_KEY: process.env.SECRETS_OPEN_AI_API_KEY as string,
    NFT_STORAGE_API_KEY: process.env.SECRETS_NFT_STORAGE_API_KEY as string,
  });

  // Create Gelato automated ask
  console.log("Creating Task...");
  const { taskId, tx }: TaskTransaction = await gelatoOps.createTask({
    execAddress: gelatoBotNft.address,
    execSelector: gelatoBotNft.interface.getSighash("revealNft(uint256 tokenId, string memory tokenURI)"),
    execAbi: gelatoBotNft.interface.format("json") as string,
    name: "Gelato Bot NFT Generator v0.2",
    dedicatedMsgSender: true,
    web3FunctionHash: cid,
    web3FunctionArgs: { nftAddress: gelatoBotNft.address, genesisBlock },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(`> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
