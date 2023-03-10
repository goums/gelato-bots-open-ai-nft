/* eslint-disable @typescript-eslint/naming-convention */
import { Web3Function, Web3FunctionContext } from "@gelatonetwork/web3-functions-sdk";
import { Contract, constants, ethers } from "ethers";
import { Configuration, OpenAIApi } from "openai";
import { NFTStorage, File } from "nft.storage";
import Chance from "chance";
import axios, { AxiosError } from "axios";

const MAX_RANGE = 100;
const MAX_REQUESTS = 10;
const NFT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function revealNft(uint256 tokenId, string memory tokenURI) external",
];

async function lookUpkMintEvent(
  lastBlock: number,
  currentBlock: number,
  nft: Contract,
  provider: ethers.providers.Provider
) {
  let nbRequests = 0;
  const topics = [nft.interface.getEventTopic("Transfer")];
  // Fetch historical events in batch without exceeding runtime limits
  while (lastBlock < currentBlock && nbRequests < MAX_REQUESTS) {
    nbRequests++;
    const fromBlock = lastBlock + 1;
    const toBlock = Math.min(fromBlock + MAX_RANGE, currentBlock);
    try {
      console.log(`Fetching log events from blocks ${fromBlock} to ${toBlock}`);
      const eventFilter = { address: nft.address, topics, fromBlock, toBlock };
      const transferLogs = await provider.getLogs(eventFilter);
      for (const transferLog of transferLogs) {
        const transferEvent = nft.interface.parseLog(transferLog);
        const [from, to, tokenId] = transferEvent.args;
        // Look up for Mint event (= Transfer event to address zero)
        if (from === constants.AddressZero) {
          console.log(`New mint: #${tokenId} to ${to}`);
          return {
            mintEvent: transferEvent,
            mintBlockHash: transferLog.blockHash,
            lastProcessedBlock: transferLog.blockNumber,
          };
        }
      }
      lastBlock = toBlock;
    } catch (err) {
      console.error(`Rpc call failed: ${(err as Error).message}`);
      return { lastProcessedBlock: fromBlock };
    }
  }
  return { lastProcessedBlock: currentBlock };
}

function generateNftProperties(seed: string) {
  const chance = new Chance(seed);
  const place = chance.weighted(["big city", "beach marina", "ski resort"], [60, 20, 20]);
  const outfit = chance.weighted(["none", "golden crown"], [80, 20]);
  const accessory = chance.weighted(["smartphone", "laptop"], [80, 20]);
  const description = `A cute robot${
    outfit !== "none" ? `, wearing a ${outfit}` : ""
  }, eating a gelato and holding a ${accessory}, with a ${place} background, at sunset, in a cyberpunk art, 3D, video game, and pastel salmon colors`;
  return {
    description,
    attributes: [
      { trait_type: "Place", value: place },
      { trait_type: "Outfit", value: outfit },
      { trait_type: "Accessory", value: accessory },
    ],
  };
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, secrets, provider } = context;

  const nftAddress = userArgs.nftAddress;
  if (!nftAddress) throw new Error("Missing userArgs.nftAddress");
  const nft = new Contract(nftAddress as string, NFT_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  const lastBlockStr = await storage.get("lastBlockNumber");
  const lastBlock = lastBlockStr ? parseInt(lastBlockStr) : (userArgs.genesisBlock as number);
  console.log(`Last processed block: ${lastBlock}`);

  // Retrieve new mint event
  const { mintEvent, mintBlockHash, lastProcessedBlock } = await lookUpkMintEvent(
    lastBlock,
    currentBlock,
    nft,
    provider
  );

  if (!mintEvent || !mintBlockHash) {
    await storage.set("lastBlockNumber", lastProcessedBlock.toString());
    return { canExec: false, message: `No new mint (at block #${lastProcessedBlock})` };
  }

  // Generate NFT properties
  const [, , tokenId] = mintEvent.args;
  const nftProps = generateNftProperties(`${lastProcessedBlock}_${mintBlockHash}`);
  console.log(`Open AI prompt: ${nftProps.description}`);

  // Generate NFT image with OpenAI (Dall-E)
  const openAiApiKey = await secrets.get("OPEN_AI_API_KEY");
  if (!openAiApiKey) throw new Error("Missing secrets.OPEN_AI_API_KEY");
  const openai = new OpenAIApi(new Configuration({ apiKey: openAiApiKey }));
  let imageUrl: string;
  try {
    const response = await openai.createImage({
      prompt: nftProps.description,
      size: "512x512",
    });
    imageUrl = response.data.data[0].url as string;
    console.log(`Open AI generated image: ${imageUrl}`);
  } catch (_err) {
    const openAiError = _err as AxiosError;
    const errrorMessage = openAiError.response
      ? `${openAiError.response.status}: ${openAiError.response.data}`
      : openAiError.message;
    return { canExec: false, message: `OpenAI error: ${errrorMessage}` };
  }

  // Publish NFT metadata on IPFS
  const imageBlob = (await axios.get(imageUrl, { responseType: "blob" })).data;
  const nftStorageApiKey = await secrets.get("NFT_STORAGE_API_KEY");
  if (!nftStorageApiKey) throw new Error("Missing secrets.NFT_STORAGE_API_KEY");
  const client = new NFTStorage({ token: nftStorageApiKey });
  const imageFile = new File([imageBlob], `gelato_bot_${tokenId}.png`, { type: "image/png" });
  const metadata = await client.store({
    name: `GelatoBot #${tokenId}`,
    description: nftProps.description,
    image: imageFile,
    attributes: nftProps.attributes,
    collection: { name: "GelatoBots", family: "gelatobots" },
  });
  console.log("IPFS Metadata:", metadata.url);

  await storage.set("lastBlockNumber", lastProcessedBlock.toString());
  return {
    canExec: true,
    callData: nft.interface.encodeFunctionData("revealNft", [tokenId, metadata.url]),
  };
});
