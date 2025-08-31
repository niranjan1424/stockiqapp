import requests
import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import os
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- API Configuration ---
API_KEY = os.getenv("FMP_API_KEY", "GLX7pkHb0CKnCkA2ThBMZqs5911mGOO1")
BASE_URL = "https://financialmodelingprep.com/api/v3"

# --- Caching Mechanism ---
CACHE: Dict[str, Any] = {}
CACHE_EXPIRY_SECONDS = 120 # Cache for 2 minutes to respect API limits

def get_from_cache(key: str) -> Optional[Any]:
    if key in CACHE:
        data, timestamp = CACHE[key]
        if time.time() - timestamp < CACHE_EXPIRY_SECONDS:
            return data
    return None

def set_in_cache(key: str, data: Any):
    CACHE[key] = (data, time.time())

# --- Mappings for FMP API ---
DATE_RANGES = {
    "1D": (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d'),
    "1W": (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
    "1M": (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
    "6M": (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d'),
    "1Y": (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'),
    "5Y": (datetime.now() - timedelta(days=365*5)).strftime('%Y-%m-%d'),
}

async def fetch_historical_data(ticker: str, period_key: str) -> pd.DataFrame:
    cache_key = f"history_{ticker}_{period_key}"
    cached_data = get_from_cache(cache_key)
    if isinstance(cached_data, pd.DataFrame):
        return cached_data

    from_date = DATE_RANGES.get(period_key)
    endpoint = f"/historical-price-full/{ticker}?apikey={API_KEY}"
    if from_date:
        to_date = datetime.now().strftime('%Y-%m-%d')
        endpoint = f"/historical-price-full/{ticker}?from={from_date}&to={to_date}&apikey={API_KEY}"

    try:
        response = requests.get(f"{BASE_URL}{endpoint}")
        response.raise_for_status()
        data = response.json()
        
        historical_data = data.get("historical", [])
            
        if not historical_data or not isinstance(historical_data, list):
            logger.warning(f"No historical data found for {ticker} for period {period_key}")
            return pd.DataFrame()

        df = pd.DataFrame(historical_data)
        df.rename(columns={'date': 'Date', 'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}, inplace=True)
        df['Date'] = pd.to_datetime(df['Date'])
        
        set_in_cache(cache_key, df)
        return df.sort_values(by='Date', ascending=True)

    except requests.exceptions.RequestException as e:
        logger.error(f"FMP API request failed for {ticker} historical data: {e}")
        return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error processing historical data for {ticker}: {e}")
        return pd.DataFrame()


async def fetch_stock_info(ticker: str) -> Optional[Dict[str, Any]]:
    cache_key = f"info_{ticker}"
    cached_data = get_from_cache(cache_key)
    if cached_data is not None:
        return cached_data
    
    endpoint = f"/profile/{ticker}?apikey={API_KEY}"
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}")
        response.raise_for_status()
        data = response.json()

        if not data or not isinstance(data, list) or not data[0]:
            logger.warning(f"No profile info found for {ticker}")
            return None

        info = data[0]
        
        quote_endpoint = f"/quote/{ticker}?apikey={API_KEY}"
        quote_response = requests.get(f"{BASE_URL}{quote_endpoint}")
        quote_data = quote_response.json()
        previous_close = quote_data[0].get("previousClose") if (quote_data and isinstance(quote_data, list) and len(quote_data) > 0) else info.get("price")

        required_info = {
            "symbol": info.get("symbol"),
            "currentPrice": info.get("price"),
            "previousClose": previous_close,
            "marketCap": info.get("mktCap"),
            "trailingPE": None,
            "launchDate": info.get("ipoDate")
        }
        set_in_cache(cache_key, required_info)
        return required_info
    except Exception as e:
        logger.error(f"Error fetching stock info for {ticker}: {e}")
        return None


async def fetch_batch_stock_info(tickers: List[str]) -> Dict[str, Any]:
    if not tickers: return {}
    
    # Use reliable international tickers for the ticker tape as FMP has limits on index tickers
    if "^NSEI" in tickers or "^BSESN" in tickers:
        tickers = ["SPY", "DIA"] 
    
    ticker_string = ",".join(tickers)
    cache_key = f"batch_{ticker_string}"
    cached_data = get_from_cache(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        endpoint = f"/quote/{ticker_string}?apikey={API_KEY}"
        response = requests.get(f"{BASE_URL}{endpoint}")
        response.raise_for_status()
        data = response.json()

        results = {}
        if data and isinstance(data, list):
            for item in data:
                ticker_symbol = item.get("symbol")
                if ticker_symbol == "SPY": ticker_symbol = "NIFTY 50"
                if ticker_symbol == "DIA": ticker_symbol = "SENSEX"
                
                if ticker_symbol:
                    results[ticker_symbol] = {
                        "currentPrice": item.get("price", 0),
                        "change": item.get("change", 0),
                        "percentChange": item.get("changesPercentage", 0)
                    }
        
        set_in_cache(cache_key, results)
        return results
    except Exception as e:
        logger.error(f"Batch fetch failed for tickers {tickers}: {e}")
        return {t: {"currentPrice": 0, "change": 0, "percentChange": 0} for t in tickers}

async def fetch_data_for_range(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    return await fetch_historical_data(ticker, "5Y") # Fallback to 5Y data for export