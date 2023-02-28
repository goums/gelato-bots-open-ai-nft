import { HardhatUserConfig } from "hardhat/config";

// PLUGINS
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_ID = process.env.ALCHEMY_ID;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "goerli",
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API_KEY ?? "",
      polygon: POLYGONSCAN_API_KEY ?? "",
    },
  },

  networks: {
    goerli: {
      chainId: 5,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_ID}`,
    },

    polygon: {
      chainId: 137,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      url: `https://goerli.optimism.io`,
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.12",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },
};

export default config;
