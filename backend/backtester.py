import pandas as pd
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backtest_strategy(df: pd.DataFrame, holding_days: int = 10, min_score: float = 50.0, stop_loss_pct: float = 5, take_profit_pct: float = 10) -> List[Dict]:
    results = []
    df = df.copy().dropna(subset=['Close', 'Score'])

    if len(df) < holding_days + 1:
        logger.warning(f"DataFrame too short for backtesting (length={len(df)}, required={holding_days+1})")
        return []

    # Ensure index is datetime for proper slicing
    if not isinstance(df.index, pd.DatetimeIndex):
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)

    for i in range(len(df) - holding_days):
        entry_row = df.iloc[i]
        
        if entry_row['Score'] >= min_score:
            buy_date = df.index[i]
            buy_price = entry_row['Close']
            
            take_profit_price = buy_price * (1 + take_profit_pct / 100)
            stop_loss_price = buy_price * (1 - stop_loss_pct / 100)
            
            sell_date = df.index[i + holding_days]
            sell_price = df.iloc[i + holding_days]['Close']
            exit_reason = f"Held for {holding_days} days"

            # Check for take profit or stop loss within the holding period
            for j in range(1, holding_days + 1):
                day_price_high = df.iloc[i + j]['High']
                day_price_low = df.iloc[i + j]['Low']
                
                if day_price_high >= take_profit_price:
                    sell_price = take_profit_price
                    sell_date = df.index[i + j]
                    exit_reason = "Take Profit Hit"
                    break
                elif day_price_low <= stop_loss_price:
                    sell_price = stop_loss_price
                    sell_date = df.index[i + j]
                    exit_reason = "Stop Loss Hit"
                    break

            return_pct = ((sell_price - buy_price) / buy_price) * 100
            
            results.append({
                'Buy Date': buy_date.strftime('%Y-%m-%d'),
                'Sell Date': sell_date.strftime('%Y-%m-%d'),
                'Buy Price': round(buy_price, 2),
                'Sell Price': round(sell_price, 2),
                'Return (%)': round(return_pct, 2),
                'Exit Reason': exit_reason
            })

    return results