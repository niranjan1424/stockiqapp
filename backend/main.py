import logging
import os  # <-- Added for robust path handling
from datetime import datetime
import pandas as pd
import numpy as np
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json
from passlib.context import CryptContext
from fastapi.responses import StreamingResponse
import io
import feedparser

# Import your local modules
import ml_model
import indicators
import fetch_data
import news_helper
import backtester

# --- App Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI(title="Stock Analysis API v17.2 (Robust File Handling)", version="17.2.0")

@app.get("/")
async def root():
    return {"message": "StockIQ API is running successfully!"}

# --- Security & DB Setup ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
USERS_DB_FILE = "users.json"
TRANSACTIONS_DB_FILE = "transactions.json"

# --- Middleware ---

# Define the origins that are allowed to connect to this backend
origins = [
    "http://localhost:3000",
    "https://stockiqapp.onrender.com",
    "https://stockiqapp.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class NewsItem(BaseModel): title: str; date: str; summary: str; link: str

class IndicatorSetting(BaseModel):
    name: str
    params: Dict[str, Any]

class AnalysisRequest(BaseModel):
    ticker: str
    period: str
    indicators: List[IndicatorSetting]

class AnalysisResponse(BaseModel):
    ticker: str
    data: List[Dict[str, Any]]
    news: List[NewsItem]
    currentPrice: float
    previousClose: float
    marketCap: str
    peRatio: float
    launchDate: str

class PredictionResponse(BaseModel):
    nextDayPrice: float
    accuracy: float
    trade_status: str
    sentiment: float

class ExchangeRateResponse(BaseModel):
    usd_to_inr: float

class PortfolioRequest(BaseModel): tickers: List[str]
class UserCreate(BaseModel): username: str; password: str
class UserLogin(BaseModel): username: str; password: str
class IndexData(BaseModel): currentPrice: float; change: float; percentChange: float
class Transaction(BaseModel): type: str; ticker: str; quantity: float; price: float; timestamp: str
class TransactionRequest(BaseModel): username: str; transaction: Transaction
class BacktestRequest(BaseModel): ticker: str; holding_days: int; min_score: float; stop_loss_pct: float; take_profit_pct: float
class BacktestResultItem(BaseModel): Buy_Date: str; Sell_Date: str; Buy_Price: float; Sell_Price: float; Return_pct: float = Field(..., alias='Return (%)'); Exit_Reason: str
class BacktestResponse(BaseModel): results: List[Dict]; summary: Dict[str, Any]

# --- Database & News Helper Functions ---
def get_db(filename: str) -> Dict:
    try:
        with open(filename, "r") as f: content = f.read(); return json.loads(content) if content else {}
    except (FileNotFoundError, json.JSONDecodeError): return {}

def save_db(db: Dict, filename: str):
    with open(filename, "w") as f: json.dump(db, f, indent=4)

def get_fallback_news():
    try:
        feed = feedparser.parse("https://news.google.com/rss/search?q=stock+market+finance&hl=en-IN&gl=IN&ceid=IN:en")
        fallback_news = []
        for entry in feed.entries[:8]:
            publish_time = datetime.now()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try: ts = entry.published_parsed; publish_time = datetime(ts.tm_year, ts.tm_mon, ts.tm_mday, ts.tm_hour, ts.tm_min, ts.tm_sec)
                except (TypeError, ValueError): pass
            fallback_news.append({"title": entry.title, "date": publish_time.strftime("%b %d, %Y"), "summary": entry.source.title if hasattr(entry, 'source') else "Google News", "link": entry.link})
        return fallback_news
    except Exception as e:
        logger.error(f"Failed to fetch fallback news: {e}"); return []

# --- Auth & Portfolio Endpoints ---
@app.post("/signup")
async def signup(user: UserCreate):
    users_db = get_db(USERS_DB_FILE)
    if user.username in users_db: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    users_db[user.username] = {"hashed_password": pwd_context.hash(user.password)}
    save_db(users_db, USERS_DB_FILE)
    transactions_db = get_db(TRANSACTIONS_DB_FILE); transactions_db[user.username] = []; save_db(transactions_db, TRANSACTIONS_DB_FILE)
    return {"username": user.username}

@app.post("/login")
async def login(user: UserLogin):
    db = get_db(USERS_DB_FILE)
    db_user = db.get(user.username)
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incorrect username or password")
    return {"username": user.username}

@app.post("/verify-password")
async def verify_password(user: UserLogin):
    db = get_db(USERS_DB_FILE)
    db_user = db.get(user.username)
    if db_user and pwd_context.verify(user.password, db_user["hashed_password"]):
        return {"verified": True}
    return {"verified": False}

@app.post("/log-transaction")
async def log_transaction(req: TransactionRequest):
    db = get_db(TRANSACTIONS_DB_FILE)
    if req.username not in db: db[req.username] = []
    db[req.username].insert(0, req.transaction.dict())
    save_db(db, TRANSACTIONS_DB_FILE)
    return {"status": "success"}

@app.get("/get-transactions", response_model=List[Transaction])
async def get_transactions(username: str):
    db = get_db(TRANSACTIONS_DB_FILE)
    return db.get(username, [])

@app.post("/portfolio-data")
async def get_portfolio_data(req: PortfolioRequest):
    if not req.tickers: return {}
    try:
        batch_info = await fetch_data.fetch_batch_stock_info(req.tickers)
        return batch_info
    except Exception as e:
        logger.error(f"Error fetching portfolio data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch live data for portfolio.")

@app.get("/market-indices", response_model=Dict[str, IndexData])
async def get_market_indices():
    try:
        indices_tickers = ["^NSEI", "^BSESN"]
        data = await fetch_data.fetch_batch_stock_info(indices_tickers)
        return {"NIFTY 50": data.get("^NSEI", {}), "SENSEX": data.get("^BSESN", {})}
    except Exception as e:
        logger.error(f"Error fetching market indices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch market indices data.")

@app.get("/get_all_tickers", response_model=List[str])
async def get_all_tickers():
    international_tickers = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "BTC-USD", "ETH-USD"]
    
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, 'nse_tickers.csv')
        
        logger.info(f"Attempting to read tickers from: {csv_path}")
        
        if not os.path.exists(csv_path):
            logger.error(f"CRITICAL: 'nse_tickers.csv' does not exist at path: {csv_path}")
            raise HTTPException(status_code=500, detail="Server configuration error: Ticker file is missing.")

        df = pd.read_csv(csv_path)
        
        if 'SYMBOL' not in df.columns:
            logger.error("CRITICAL: 'nse_tickers.csv' is missing the required 'SYMBOL' column.")
            raise HTTPException(status_code=500, detail="Server configuration error: Ticker file is malformed.")

        df.dropna(subset=['SYMBOL'], inplace=True)
        indian_tickers = [f"{symbol.strip()}.NS" for symbol in df['SYMBOL'].unique()] + ["HINDZINC.NS"]
        
        all_tickers = sorted(list(set(international_tickers + indian_tickers)))
        logger.info(f"Successfully loaded {len(all_tickers)} tickers.")
        return all_tickers

    except Exception as e:
        logger.error(f"An unexpected error occurred while reading nse_tickers.csv: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred while loading stock tickers.")

@app.get("/get-exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate():
    try:
        return {"usd_to_inr": 83.50}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/general-news", response_model=List[NewsItem])
async def get_general_news():
    try:
        news = get_fallback_news()
        return [NewsItem(**item) for item in news]
    except Exception as e:
        logger.error(f"Error fetching general news: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch general news.")

# --- Core Application Endpoints ---

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_stock(req: AnalysisRequest):
    try:
        df_chart = await fetch_data.fetch_historical_data(req.ticker, req.period)
        if df_chart.empty:
            raise HTTPException(status_code=404, detail=f"No data for '{req.ticker}' with period '{req.period}'.")

        stock_info = await fetch_data.fetch_stock_info(req.ticker)
        if not stock_info or not stock_info.get("symbol"):
            raise HTTPException(status_code=404, detail=f"Could not retrieve info for '{req.ticker}'.")

        indicators_as_dicts = [ind.dict() for ind in req.indicators]
        df_with_indicators = indicators.calculate_indicators(df_chart.set_index('Date'), indicators_as_dicts)
        
        news_dict_list = news_helper.get_news(req.ticker)
        if not news_dict_list: news_dict_list = get_fallback_news()

        current_price = stock_info.get("currentPrice") or df_with_indicators['Close'].iloc[-1]
        
        chart_data_list = df_with_indicators.reset_index().replace({np.nan: None}).to_dict(orient="records")
        final_chart_data = [{str(k): (v.isoformat() if isinstance(v, (datetime, pd.Timestamp)) else v) for k, v in row.items()} for row in chart_data_list]
        
        currency_symbol = "₹" if ".NS" in req.ticker.upper() else "$"
        
        return AnalysisResponse(
            ticker=stock_info.get("symbol", req.ticker.upper()),
            data=final_chart_data,
            news=[NewsItem(**item) for item in news_dict_list],
            currentPrice=float(current_price),
            previousClose=float(stock_info.get("previousClose", 0)),
            marketCap=f"{currency_symbol}{stock_info.get('marketCap', 0):,}",
            peRatio=float(stock_info.get("trailingPE", 0.0)),
            launchDate=stock_info.get("launchDate", "N/A"),
        )
    except Exception as e:
        logger.error(f"Analysis failed for {req.ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/predict", response_model=PredictionResponse)
async def predict_stock(ticker: str):
    try:
        df_model_train = await fetch_data.fetch_historical_data(ticker, "5Y")
        if df_model_train.empty:
            raise HTTPException(status_code=404, detail=f"No long-term data for '{ticker}' to train model.")

        model, scaler = ml_model.train_ml_model(df_model_train.copy())
        
        predicted_price, accuracy = ml_model.get_prediction(model, scaler, df_model_train.copy())

        stock_info = await fetch_data.fetch_stock_info(ticker)
        current_price = stock_info.get("currentPrice") if stock_info else df_model_train['Close'].iloc[-1]
        
        news_dict_list = news_helper.get_news(ticker)
        sentiment = news_helper.analyze_sentiment(news_dict_list)

        trade_status = "HOLD"
        if current_price is not None and isinstance(current_price, (int, float)):
            if predicted_price > (current_price * 1.01):
                trade_status = "BUY"
            elif predicted_price < current_price:
                trade_status = "SELL"

        return PredictionResponse(
            nextDayPrice=predicted_price,
            accuracy=accuracy,
            trade_status=trade_status,
            sentiment=sentiment
        )
    except Exception as e:
        logger.error(f"Prediction failed for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during prediction: {str(e)}")

@app.post("/backtest")
async def run_backtest(req: BacktestRequest):
    try:
        df = await fetch_data.fetch_historical_data(req.ticker, "5Y")
        if df.empty: raise HTTPException(status_code=404, detail=f"Could not fetch historical data for {req.ticker} for backtesting.")
        df.set_index('Date', inplace=True)
        
        default_indicators = [
            {"name": "EMA", "params": {"period": 20}},
            {"name": "EMA", "params": {"period": 50}},
            {"name": "RSI", "params": {"period": 14}},
            {"name": "BBands", "params": {"period": 20, "std_dev": 2}},
        ]
        df_with_indicators = indicators.calculate_indicators(df.copy(), default_indicators)
        results = backtester.backtest_strategy(df_with_indicators.reset_index(), holding_days=req.holding_days, min_score=req.min_score, stop_loss_pct=req.stop_loss_pct, take_profit_pct=req.take_profit_pct)
        summary = {}
        if results:
            returns = [r['Return (%)'] for r in results]
            summary = {"total_trades": len(results), "average_return": round(np.mean(returns), 2) if returns else 0, "win_rate": round(len([r for r in returns if r > 0]) / len(returns) * 100, 2) if returns else 0, "total_return_cumulative": round(np.sum(returns), 2)}
        return {"results": results, "summary": summary}
    except Exception as e:
        logger.error(f"Backtesting failed for {req.ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred during backtesting: {str(e)}")

@app.get("/export")
async def export_stock_data(ticker: str, startDate: str, endDate: str):
    try:
        df = await fetch_data.fetch_data_for_range(ticker, startDate, endDate)
        if df.empty: raise HTTPException(status_code=404, detail=f"No data for {ticker} in range.")
        df['Date'] = pd.to_datetime(df['Date'])
        
        default_indicators = [
            {"name": "SMA", "params": {"period": 20}},
            {"name": "SMA", "params": {"period": 50}},
            {"name": "EMA", "params": {"period": 20}},
            {"name": "EMA", "params": {"period": 50}},
            {"name": "RSI", "params": {"period": 14}},
            {"name": "MACD", "params": {"fast": 12, "slow": 26, "signal": 9}},
            {"name": "BBands", "params": {"period": 20, "std_dev": 2}},
            {"name": "ATR", "params": {"period": 14}},
            {"name": "OBV", "params": {}},
        ]
        df_with_indicators = indicators.calculate_indicators(df.set_index('Date'), default_indicators)
        output = io.StringIO()
        df_with_indicators.reset_index().to_csv(output, index=False)
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={ticker}_data_{startDate}_to_{endDate}.csv"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during export: {str(e)}")