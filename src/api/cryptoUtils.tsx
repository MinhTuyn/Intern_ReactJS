/**
 * Cryptocurrency list with image URLs
 */
export const cryptoCoins = [
  {
    cryptoName: "BTCUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
  },
  {
    cryptoName: "ETHUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
  },
  {
    cryptoName: "SOLUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png",
  }, // Assuming this was meant to be SOL, not 2010. If 2010 is a specific coin ID, adjust as needed.
  {
    cryptoName: "DOTUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png",
  },
  {
    cryptoName: "BNBUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png",
  },
  {
    cryptoName: "LINKUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png",
  },
  {
    cryptoName: "CAKEUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/7186.png",
  },
  {
    cryptoName: "MATICUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png",
  },
  {
    cryptoName: "OMUSDT",
    cryptoImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png",
  }, // Note: OMUSDT image is same as MATICUSDT in your example
];

/**
 * Get the image URL of a cryptocurrency
 * @param getCoin Cryptocurrency symbol (e.g., BTCUSDT)
 * @returns Image URL or null
 */
export const getCryptoImage = (getCoin: string): string | null => {
  const coin = cryptoCoins.find((crypto) => crypto.cryptoName === getCoin);
  return coin ? coin.cryptoImage : null;
};

/**
 * Convert Unix timestamp to human-readable date
 * @param unix Unix timestamp (milliseconds)
 * @returns Formatted date string
 */
export const unixToDate = (unix: number): string => {
  return new Date(unix).toLocaleString();
};
