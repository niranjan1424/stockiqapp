import requests
import pandas as pd
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import os
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- API Configuration ---
API_KEY = os.getenv("YF_API_KEY")
BASE_URL = "https://yfapi.net"

# --- Caching Mechanism ---
CACHE: Dict[str, Any] = {}
CACHE_EXPIRY_SECONDS = 120

def get_from_cache(key: str) -> Optional[Any]:
    if key in CACHE:
        data, timestamp = CACHE[key]
        if time.time() - timestamp < CACHE_EXPIRY_SECONDS:
            return data
    return None

def set_in_cache(key: str, data: Any):
    CACHE[key] = (data, time.time())

# --- Mappings for YH Finance API ---
PERIOD_MAPPING = {
    "1D": {"range": "1d", "interval": "5m"},
    "1W": {"range": "5d", "interval": "30m"},
    "1M": {"range": "1mo", "interval": "90m"},
    "6M": {"range": "6mo", "interval": "1d"},
    "1Y": {"range": "1y", "interval": "1d"},
    "5Y": {"range": "5y", "interval": "1wk"},
    "ALL": {"range": "max", "interval": "1mo"},
}

async def fetch_historical_data(ticker: str, period_key: str) -> pd.DataFrame:
    cache_key = f"history_{ticker}_{period_key}"
    cached_data = get_from_cache(cache_key)
    if isinstance(cached_data, pd.DataFrame):
        return cached_data

    params = PERIOD_MAPPING.get(period_key, PERIOD_MAPPING["1M"])
    endpoint = f"/v8/finance/chart/{ticker}"
    headers = {'X-API-KEY': API_KEY}
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        chart_data = data.get("chart", {}).get("result", [])[0]
        if not chart_data or "timestamp" not in chart_data:
            logger.warning(f"No historical data in response for {ticker}")
            return pd.DataFrame()

        timestamps = chart_data["timestamp"]
        ohlc = chart_data["indicators"]["quote"][0]
        
        df = pd.DataFrame({
            'Date': [datetime.fromtimestamp(ts) for ts in timestamps],
            'Open': ohlc['open'],
            'High': ohlc['high'],
            'Low': ohlc['low'],
            'Close': ohlc['close'],
            'Volume': ohlc['volume']
        })
        
        df.dropna(inplace=True)
        set_in_cache(cache_key, df)
        return df

    except requests.exceptions.RequestException as e:
        logger.error(f"YH API request failed for {ticker} historical data: {e}")
        return pd.DataFrame()
    except (KeyError, IndexError, TypeError) as e:
        logger.error(f"Error parsing historical data for {ticker}: {e}")
        return pd.DataFrame()

async def fetch_stock_info(ticker: str) -> Optional[Dict[str, Any]]:
    cache_key = f"info_{ticker}"
    cached_data = get_from_cache(cache_key)
    if cached_data is not None:
        return cached_data

    endpoint = f"/v6/finance/quote"
    headers = {'X-API-KEY': API_KEY}
    params = {'symbols': ticker}

    try:
        response = requests.get(f"{BASE_URL}{endpoint}", params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        info = data.get("quoteResponse", {}).get("result", [])[0]
        if not info:
            logger.warning(f"No profile info found for {ticker}")
            return None

        required_info = {
            "symbol": info.get("symbol"),
            "currentPrice": info.get("regularMarketPrice"),
            "previousClose": info.get("regularMarketPreviousClose"),
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "launchDate": str(datetime.fromtimestamp(info.get("firstTradeDateMilliseconds", 0)//1000).date()) if info.get("firstTradeDateMilliseconds") else "N/A"
        }
        set_in_cache(cache_key, required_info)
        return required_info
    except Exception as e:
        logger.error(f"Error fetching stock info for {ticker}: {e}")
        return None

async def fetch_batch_stock_info(tickers: List[str]) -> Dict[str, Any]:
    if not tickers: return {}
    
    ticker_string = ",".join(tickers)
    cache_key = f"batch_{ticker_string}"
    cached_data = get_from_cache(cache_key)
    if cached_data is not None:
        return cached_data

    endpoint = f"/v6/finance/quote"
    headers = {'X-API-KEY': API_KEY}
    params = {'symbols': ticker_string}

    try:
        response = requests.get(f"{BASE_URL}{endpoint}", params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        results = {}
        result_list = data.get("quoteResponse", {}).get("result", [])
        if result_list:
            for item in result_list:
                ticker_symbol = item.get("symbol")
                if ticker_symbol:
                    results[ticker_symbol] = {
                        "currentPrice": item.get("regularMarketPrice", 0),
                        "change": item.get("regularMarketChange", 0),
                        "percentChange": item.get("regularMarketChangePercent", 0)
                    }
        
        # Remap for frontend display
        final_results = {}
        for key, value in results.items():
            if key == "^NSEI": final_results["NIFTY 50"] = value
            elif key == "^BSESN": final_results["SENSEX"] = value
            else: final_results[key] = value
        
        set_in_cache(cache_key, final_results)
        return final_results
    except Exception as e:
        logger.error(f"Batch fetch failed for tickers {tickers}: {e}")
        return {t: {"currentPrice": 0, "change": 0, "percentChange": 0} for t in tickers}

async def fetch_data_for_range(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    return await fetch_historical_data(ticker, "5Y") # Fallback to 5Y of daily data for export