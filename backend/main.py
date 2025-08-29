import logging
import os
import numpy as np
from datetime import datetime
import pandas as pd
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
app = FastAPI(title="Stock Analysis API v18 (FMP Stable)", version="18.0.0")

@app.get("/")
async def root():
    return {"message": "StockIQ API is running successfully!"}

# --- Security & DB Setup ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
USERS_DB_FILE = "users.json"
TRANSACTIONS_DB_FILE = "transactions.json"

# --- Middleware ---
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

# CORRECTED: Changed marketCap to Optional[int] and other fields to handle potential None values
class AnalysisResponse(BaseModel):
    ticker: str
    data: List[Dict[str, Any]]
    news: List[NewsItem]
    currentPrice: Optional[float]
    previousClose: Optional[float]
    marketCap: Optional[int]
    peRatio: Optional[float]
    launchDate: Optional[str]

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
    return await fetch_data.fetch_batch_stock_info(req.tickers)

@app.get("/market-indices")
async def get_market_indices():
    return await fetch_data.fetch_batch_stock_info(["^NSEI", "^BSESN"])

@app.get("/get_all_tickers", response_model=List[str])
async def get_all_tickers():
    international_tickers = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "BTC-USD", "ETH-USD"]
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, 'nse_tickers.csv')
        
        if not os.path.exists(csv_path):
            logger.error(f"CRITICAL: 'nse_tickers.csv' does not exist at path: {csv_path}")
            return international_tickers

        df = pd.read_csv(csv_path)
        
        if 'SYMBOL' not in df.columns:
            logger.error("CRITICAL: 'nse_tickers.csv' is missing the required 'SYMBOL' column.")
            return international_tickers

        df.dropna(subset=['SYMBOL'], inplace=True)
        indian_tickers = [f"{symbol.strip()}.NS" for symbol in df['SYMBOL'].unique()] + ["HINDZINC.NS"]
        
        all_tickers = sorted(list(set(international_tickers + indian_tickers)))
        logger.info(f"Successfully loaded {len(all_tickers)} tickers.")
        return all_tickers
    except Exception as e:
        logger.error(f"An unexpected error occurred while reading nse_tickers.csv: {e}", exc_info=True)
        return international_tickers

@app.get("/get-exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate():
    # In a real app, fetch this from an API. For now, a static value is fine.
    return {"usd_to_inr": 83.50}
        
@app.get("/general-news", response_model=List[NewsItem])
async def get_general_news():
    return get_fallback_news()

# --- Core Application Endpoints ---

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_stock(req: AnalysisRequest):
    df_chart = await fetch_data.fetch_historical_data(req.ticker, req.period)
    if df_chart.empty:
        raise HTTPException(status_code=404, detail=f"No historical data found for '{req.ticker}' with period '{req.period}'.")

    stock_info = await fetch_data.fetch_stock_info(req.ticker)
    if not stock_info or not stock_info.get("symbol"):
        raise HTTPException(status_code=404, detail=f"Could not retrieve summary info for '{req.ticker}'.")
    
    indicators_as_dicts = [ind.dict() for ind in req.indicators]
    df_with_indicators = indicators.calculate_indicators(df_chart.set_index('Date'), indicators_as_dicts)
    
    news_dict_list = get_fallback_news() # Using fallback news for reliability
    
    current_price = stock_info.get("currentPrice") or df_with_indicators['Close'].iloc[-1]
    chart_data_list = df_with_indicators.reset_index().replace({pd.NA: None, np.nan: None}).to_dict(orient="records")
    final_chart_data = [{str(k): (v.isoformat() if isinstance(v, (datetime, pd.Timestamp)) else v) for k, v in row.items()} for row in chart_data_list]
    
    return AnalysisResponse(
        ticker=stock_info.get("symbol", req.ticker.upper()),
        data=final_chart_data,
        news=[NewsItem(**item) for item in news_dict_list],
        currentPrice=float(current_price or 0),
        previousClose=float(stock_info.get("previousClose") or 0),
        marketCap=stock_info.get("marketCap"),
        peRatio=stock_info.get("trailingPE"),
        launchDate=stock_info.get("launchDate")
    )

@app.get("/predict", response_model=PredictionResponse)
async def predict_stock(ticker: str):
    # This is a placeholder as ML model training is complex and resource-intensive for a live server
    # In a real-world scenario, you would call a pre-trained model here.
    df = await fetch_data.fetch_historical_data(ticker, "1M")
    if df.empty:
        raise HTTPException(status_code=404, detail="Not enough data for prediction.")
    
    last_price = df['Close'].iloc[-1]
    predicted_price = last_price * 1.005 # Simple placeholder prediction
    
    return PredictionResponse(
        nextDayPrice=predicted_price,
        accuracy=0.75,
        trade_status="HOLD",
        sentiment=0.5
    )

@app.post("/backtest")
async def run_backtest(req: BacktestRequest):
    raise HTTPException(status_code=501, detail="Backtesting endpoint is not implemented yet.")

@app.get("/export")
async def export_stock_data(ticker: str, startDate: str, endDate: str):
    df = await fetch_data.fetch_data_for_range(ticker, startDate, endDate)
    if df.empty: raise HTTPException(status_code=404, detail=f"No data for {ticker} in range.")
    
    default_indicators = [
        {"name": "SMA", "params": {"period": 20}}, {"name": "RSI", "params": {"period": 14}},
        {"name": "MACD", "params": {"fast": 12, "slow": 26, "signal": 9}},
    ]
    df_with_indicators = indicators.calculate_indicators(df.set_index('Date'), default_indicators)
    output = io.StringIO()
    df_with_indicators.reset_index().to_csv(output, index=False)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={ticker}_data.csv"})