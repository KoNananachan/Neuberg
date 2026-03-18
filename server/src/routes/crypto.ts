import { Router } from 'express';

const router = Router();

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const UA = 'Neuberg/1.0';

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number | null;
  sparkline_in_7d: { price: number[] } | null;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  max_supply: number | null;
}

interface CryptoQuote {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  price: number;
  change24h: number;
  change7d: number | null;
  marketCap: number;
  volume24h: number;
  sparkline7d: number[];
  ath: number;
  athChangePercent: number;
  circulatingSupply: number;
  maxSupply: number | null;
}

interface GlobalData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

interface CryptoData {
  coins: CryptoQuote[];
  global: GlobalData | null;
}

// Cache for 2 minutes (respect CoinGecko free rate limits)
let cryptoCache: { data: CryptoData; expiresAt: number } = {
  data: { coins: [], global: null },
  expiresAt: 0,
};
const CACHE_TTL = 120_000;

async function fetchMarkets(): Promise<CryptoQuote[]> {
  const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    console.error(`[Crypto] CoinGecko markets returned ${resp.status}`);
    return [];
  }

  const data: CoinMarket[] = await resp.json();

  return data.map((c) => ({
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    rank: c.market_cap_rank ?? 0,
    price: c.current_price ?? 0,
    change24h: c.price_change_percentage_24h ?? 0,
    change7d: c.price_change_percentage_7d_in_currency ?? null,
    marketCap: c.market_cap ?? 0,
    volume24h: c.total_volume ?? 0,
    sparkline7d: c.sparkline_in_7d?.price ?? [],
    ath: c.ath ?? 0,
    athChangePercent: c.ath_change_percentage ?? 0,
    circulatingSupply: c.circulating_supply ?? 0,
    maxSupply: c.max_supply,
  }));
}

async function fetchGlobal(): Promise<GlobalData | null> {
  try {
    const url = `${COINGECKO_API}/global`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as any;
    const d = data?.data;
    if (!d) return null;

    return {
      totalMarketCap: d.total_market_cap?.usd ?? 0,
      totalVolume24h: d.total_volume?.usd ?? 0,
      btcDominance: d.market_cap_percentage?.btc ?? 0,
      ethDominance: d.market_cap_percentage?.eth ?? 0,
      activeCryptos: d.active_cryptocurrencies ?? 0,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
    };
  } catch {
    return null;
  }
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cryptoCache.data.coins.length > 0 && now < cryptoCache.expiresAt) {
      return res.json(cryptoCache.data);
    }

    const [coins, global] = await Promise.all([fetchMarkets(), fetchGlobal()]);

    const data: CryptoData = { coins, global };

    if (coins.length > 0) {
      cryptoCache = { data, expiresAt: now + CACHE_TTL };
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Crypto] Error:', err?.message || err);
    if (cryptoCache.data.coins.length > 0) {
      return res.json(cryptoCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch crypto data' });
  }
});

export default router;
