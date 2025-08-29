import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

def fetch_stock_data(ticker, start_date, end_date):
    """Fetch OHLCV data from Yahoo Finance."""
    stock = yf.Ticker(ticker)
    df = stock.history(start=start_date, end=end_date)
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']].dropna()
    return df

def calculate_indicators(df):
    """Calculate MA, Bollinger Bands, RSI, and Volume Spikes."""
    # Moving Averages (MA20, MA50)
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['MA50'] = df['Close'].rolling(window=50).mean()
    
    # Bollinger Bands
    df['BB_Mid'] = df['Close'].rolling(window=20).mean()
    df['BB_Std'] = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = df['BB_Mid'] + 2 * df['BB_Std']
    df['BB_Lower'] = df['BB_Mid'] - 2 * df['BB_Std']
    
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # Volume Spike (Volume > 1.5x 20-day average)
    df['Volume_MA20'] = df['Volume'].rolling(window=20).mean()
    df['Volume_Spike'] = df['Volume'] > 1.5 * df['Volume_MA20']
    
    return df

def plot_price_ma(df, ticker):
    """Plot Price with MA20/MA50."""
    plt.figure(figsize=(12, 6))
    plt.plot(df.index, df['Close'], label='Close Price', color='blue')
    plt.plot(df.index, df['MA20'], label='MA20', color='orange')
    plt.plot(df.index, df['MA50'], label='MA50', color='green')
    plt.title(f'{ticker} - Price with MA20/MA50')
    plt.xlabel('Date')
    plt.ylabel('Price')
    plt.legend()
    plt.grid()
    plt.show()

def plot_bollinger_bands(df, ticker):
    """Plot Bollinger Bands."""
    plt.figure(figsize=(12, 6))
    plt.plot(df.index, df['Close'], label='Close Price', color='blue')
    plt.plot(df.index, df['BB_Upper'], label='BB Upper', color='red', linestyle='--')
    plt.plot(df.index, df['BB_Mid'], label='BB Mid (MA20)', color='orange')
    plt.plot(df.index, df['BB_Lower'], label='BB Lower', color='green', linestyle='--')
    plt.title(f'{ticker} - Bollinger Bands')
    plt.xlabel('Date')
    plt.ylabel('Price')
    plt.legend()
    plt.grid()
    plt.show()

def plot_rsi(df, ticker):
    """Plot RSI."""
    plt.figure(figsize=(12, 4))
    plt.plot(df.index, df['RSI'], label='RSI', color='purple')
    plt.axhline(30, color='red', linestyle='--', label='Oversold (30)')
    plt.axhline(70, color='green', linestyle='--', label='Overbought (70)')
    plt.title(f'{ticker} - RSI')
    plt.xlabel('Date')
    plt.ylabel('RSI')
    plt.legend()
    plt.grid()
    plt.show()

def plot_volume_spikes(df, ticker):
    """Plot Volume with Spikes Highlighted."""
    plt.figure(figsize=(12, 6))
    plt.bar(df.index, df['Volume'], label='Volume', color='gray')
    spikes = df[df['Volume_Spike']]
    plt.bar(spikes.index, spikes['Volume'], label='Volume Spike (>1.5x MA20)', color='red')
    plt.plot(df.index, df['Volume_MA20'], label='Volume MA20', color='blue')
    plt.title(f'{ticker} - Volume with Spikes')
    plt.xlabel('Date')
    plt.ylabel('Volume')
    plt.legend()
    plt.grid()
    plt.show()

def main():
    # Configuration
    ticker = 'AAPL'  # Change to desired ticker
    start_date = '2024-01-01'  # Change to desired start date
    end_date = '2024-12-31'    # Change to desired end date
    
    # Fetch and process data
    df = fetch_stock_data(ticker, start_date, end_date)
    df = calculate_indicators(df)
    
    # Generate plots
    plot_price_ma(df, ticker)
    plot_bollinger_bands(df, ticker)
    plot_rsi(df, ticker)
    plot_volume_spikes(df, ticker)

if __name__ == '__main__':
    main()