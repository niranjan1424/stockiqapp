import yfinance as yf
import pandas as pd
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PERIOD_MAPPING = {
    "1D": {"period": "2d", "interval": "15m"},
    "1W": {"period": "5d", "interval": "30m"},
    "1M": {"period": "1mo", "interval": "1d"},
    "6M": {"period": "6mo", "interval": "1d"},
    "1Y": {"period": "1y", "interval": "1d"},
    "5Y": {"period": "5y", "interval": "1wk"},
    "ALL": {"period": "max", "interval": "1mo"},
}

async def fetch_historical_data(ticker: str, period_key: str) -> pd.DataFrame:
    try:
        params = PERIOD_MAPPING.get(period_key, PERIOD_MAPPING["1M"])
        stock = yf.Ticker(ticker)
        df = stock.history(period=params["period"], interval=params["interval"], auto_adjust=True)
        
        if df.empty: return pd.DataFrame()

        df.reset_index(inplace=True)
        date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
        df.rename(columns={date_col: "Date"}, inplace=True)
        df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)

        return df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
    except Exception as e:
        logger.error(f"YFinance fetch_historical_data failed for {ticker}: {e}")
        return pd.DataFrame()

# --- DEFINITIVE FIX FOR PYLANCE ERROR ---
async def fetch_stock_info(ticker: str) -> Optional[Dict[str, Any]]:
    """ Safely fetches stock info and handles cases where the info is None. """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Critical Check: If info is None or doesn't have a symbol, return None immediately.
        if info is None or info.get("symbol") is None:
            logger.warning(f"Could not retrieve valid info for ticker: {ticker}")
            return None
        
        launch_date = "N/A"
        timestamp = info.get("firstTradeDateEpochUtc")
        if timestamp is not None and isinstance(timestamp, (int, float)):
            launch_date = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        
        return {
            "symbol": info.get("symbol"),
            "currentPrice": info.get("regularMarketPrice") or info.get("currentPrice"),
            "previousClose": info.get("previousClose"),
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "launchDate": launch_date
        }
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


async def fetch_batch_stock_info(tickers: list[str]) -> dict:
    if not tickers: return {}
    data = yf.Tickers(" ".join(tickers))
    live_info = {}
    for ticker_symbol in tickers:
        try:
            info = data.tickers[ticker_symbol].info
            price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
            prev_close = info.get("previousClose", price)
            change = price - prev_close
            percent_change = (change / prev_close) * 100 if prev_close > 0 else 0
            live_info[ticker_symbol] = {"currentPrice": price, "change": change, "percentChange": percent_change}
        except Exception:
            live_info[ticker_symbol] = {"currentPrice": 0, "change": 0, "percentChange": 0}
    return live_info