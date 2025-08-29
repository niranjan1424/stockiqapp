📈 Smart Stock Trend Analyzer
A full-stack stock trend analysis web app that fetches real-time data from Yahoo Finance via yfinance, computes technical indicators, forecasts future trends, and gives actionable buy/sell recommendations.

🔧 Tech Stack
Frontend: React (Single App.js with Tailwind, shadcn/ui, Recharts, dark mode support)

Backend: FastAPI

Data Source: Yahoo Finance via yfinance

Charting: Recharts

Deployment-ready: Works locally (npm start, uvicorn main:app --reload)

⚙️ Features
✅ Real-time stock search and analysis
✅ Technical indicators: RSI, MA20, MA50, Bollinger Bands, ATR
✅ Dynamic price chart with selectable time ranges
✅ Buy/Do Not Buy recommendation
✅ Predicted price for next trading day
✅ SIP calculator
✅ Watchlist
✅ Dark/Light mode toggle
✅ Export to CSV with start/end date

📊 Time Range Selector Logic
Option	X-Axis Granularity	Data Window
Today	Hourly (24 points)	Last 24 hours
Yesterday	Hourly (24 points)	Previous 24 hours
Last Week	Daily	Last 7 days
Last Month	Weekly	Last 4–5 weeks
1 Year	Monthly	Last 12 months
All Time	Yearly	Max data available

📥 Sample CSV Export
Date	Open	High	Low	Close	Volume	RSI	MA20	MA50	Score
2025-06-01	175.3	177.2	174.0	176.1	120000	45.22	173.9	170.5	4

Users can export such data between a start date and end date using a download button on the frontend.

📈 Technical Indicators Explained
✅ Moving Average (MA)
Smooths price trends:

MA20 = Average of past 20 days

MA50 = Average of past 50 days
Helps detect bullish/bearish crossovers.

✅ RSI (Relative Strength Index)
Momentum indicator:

text
Copy
Edit
RS = Avg Gain / Avg Loss
RSI = 100 - (100 / (1 + RS))
RSI > 70: Overbought 🔴

RSI < 30: Oversold 🟢

✅ Bollinger Bands (BB)
Uses MA20 ± (2 × Standard Deviation)

Shows price volatility (widening = high volatility)

✅ ATR (Average True Range)
Measures volatility by comparing high-low-close of each day

High ATR = more volatile stock

🔄 Frontend–Backend Connection
App.js fetches /analyze?ticker=AAPL from FastAPI

Response includes years of OHLCV + indicators + predictions

Rendered using Recharts and dashboard cards (e.g., RSI, Score)

🧹 Data Cleaning Example
Dropping NA rows after indicator calculation

Replacing infinite values

python
Copy
Edit
df.dropna(inplace=True)
df.replace([np.inf, -np.inf], np.nan, inplace=True)
📷 UI Snapshots
Add these before submission!

📊 Price Chart (Today vs All Time)

📈 RSI/MA Indicator cards

🌗 Dark Mode UI

🗃️ Download CSV form

🔍 What yfinance Provides (OHLCV)
Open, High, Low, Close, Adj Close, Volume

Intraday and historical data

News headlines (optional)

Financials and earnings (not used here)

🧪 Run Locally
Backend
bash
Copy
Edit
cd backend
uvicorn main:app --reload
Frontend
bash
Copy
Edit
cd frontend
npm install
npm start
📁 File Structure
cpp
Copy
Edit
project/
├── backend/
│   ├── main.py
│   ├── fetch_data.py
│   ├── indicators.py
│   ├── scoring.py
│   ├── ml_model.py
├── frontend/
│   ├── App.js
│   ├── components/
│   ├── public/
│   └── ...