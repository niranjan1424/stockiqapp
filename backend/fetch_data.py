import yfinance as yf
import pandas as pd
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import asyncio
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Caching Mechanism ---
CACHE: Dict[str, Any] = {}
CACHE_EXPIRY_SECONDS = 60  # Cache data for 1 minute

def get_from_cache(key: str) -> Optional[Any]:
    """Checks if a valid, non-expired item is in the cache."""
    if key in CACHE:
        data, timestamp = CACHE[key]
        if time.time() - timestamp < CACHE_EXPIRY_SECONDS:
            return data
    return None

def set_in_cache(key: str, data: Any):
    """Adds an item to the cache with a timestamp."""
    CACHE[key] = (data, time.time())

# --- Preserved PERIOD_MAPPING for correct graph intervals ---
PERIOD_MAPPING = {
    "1D": {"period": "2d", "interval": "5m"},
    "1W": {"period": "5d", "interval": "30m"},
    "1M": {"period": "1mo", "interval": "90m"},
    "6M": {"period": "6mo", "interval": "1d"},
    "1Y": {"period": "1y", "interval": "1d"},
    "5Y": {"period": "5y", "interval": "1wk"},
    "ALL": {"period": "max", "interval": "1mo"},
}

async def fetch_historical_data(ticker: str, period_key: str) -> pd.DataFrame:
    """
    Fetches historical data using the PERIOD_MAPPING for correct intervals,
    with caching, retries, and robust error handling.
    """
    cache_key = f"history_{ticker}_{period_key}"
    cached_data = get_from_cache(cache_key)
    if isinstance(cached_data, pd.DataFrame):
        return cached_data

    params = PERIOD_MAPPING.get(period_key, PERIOD_MAPPING["1M"])
    stock = yf.Ticker(ticker)

    for attempt in range(3):
        try:
            df = stock.history(period=params["period"], interval=params["interval"], auto_adjust=True)
            
            if not df.empty:
                df.reset_index(inplace=True)
                date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
                df.rename(columns={date_col: "Date"}, inplace=True)
                df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)
                
                final_df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
                set_in_cache(cache_key, final_df)
                return final_df

            await asyncio.sleep(0.5)
        except Exception as e:
            logger.error(f"YFinance fetch_historical_data attempt {attempt + 1} failed for {ticker}: {e}")
            await asyncio.sleep(1)
            
    return pd.DataFrame()


async def fetch_stock_info(ticker: str) -> Optional[Dict[str, Any]]:
    """ Safely fetches stock info with caching and handles cases where the info is None. """
    cache_key = f"info_{ticker}"
    cached_data = get_from_cache(cache_key)
    if cached_data is not None:
        return cached_data
        
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        if info is None or info.get("symbol") is None:
            logger.warning(f"Could not retrieve valid info for ticker: {ticker}")
            return None
        
        launch_date = "N/A"
        timestamp = info.get("firstTradeDateEpochUtc")
        if timestamp is not None and isinstance(timestamp, (int, float)):
            launch_date = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        
        required_info = {
            "symbol": info.get("symbol"),
            "currentPrice": info.get("regularMarketPrice") or info.get("currentPrice"),
            "previousClose": info.get("previousClose"),
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "launchDate": launch_date
        }
        set_in_cache(cache_key, required_info)
        return required_info

    except Exception as e:
        logger.error(f"An exception occurred in fetch_stock_info for {ticker}: {e}")
        return None

async def fetch_data_for_range(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(start=start_date, end=end_date, interval="1d", auto_adjust=True)
        if df.empty: return pd.DataFrame()
        df.reset_index(inplace=True)
        df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)
        return df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
    except Exception as e:
        logger.error(f"YFinance fetch_data_for_range failed for {ticker}: {e}")
        return pd.DataFrame()


async def fetch_batch_stock_info(tickers: List[str]) -> Dict[str, Any]:
    """
    Fetches info for a batch of tickers more efficiently with caching and retries.
    """
    if not tickers: return {}
    
    cache_key = f"batch_{','.join(sorted(tickers))}"
    cached_data = get_from_cache(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        data = yf.download(tickers, period="2d", progress=False)
        # Add an explicit check to ensure data is not None before proceeding
        if data is None or data.empty or 'Close' not in data:
            return {ticker: {"currentPrice": 0, "change": 0, "percentChange": 0} for ticker in tickers}

        results = {}
        for ticker in tickers:
            close_prices = None
            # Handle both single-ticker and multi-ticker DataFrame structures
            if len(tickers) == 1:
                close_prices = data['Close']
            elif isinstance(data.get('Close'), pd.DataFrame):
                close_prices = data.get('Close', {}).get(ticker)
            
            if close_prices is not None and not close_prices.dropna().empty:
                current_price = close_prices.iloc[-1]
                previous_close = close_prices.iloc[-2] if len(close_prices) > 1 else current_price
                
                if pd.isna(current_price): current_price = previous_close
                if pd.isna(previous_close): previous_close = current_price
                
                change = current_price - previous_close
                percent_change = (change / previous_close) * 100 if previous_close != 0 else 0

                results[ticker] = {
                    "currentPrice": float(current_price),
                    "change": float(change),
                    "percentChange": float(percent_change)
                }
            else:
                 results[ticker] = { "currentPrice": 0, "change": 0, "percentChange": 0 }

        set_in_cache(cache_key, results)
        return results
    except Exception as e:
        logger.error(f"Batch fetch failed for tickers {tickers}: {e}")
        return {ticker: {"currentPrice": 0, "change": 0, "percentChange": 0} for ticker in tickers}