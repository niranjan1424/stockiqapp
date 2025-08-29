# backend/scoring.py (Final Version)
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_score(row: pd.Series) -> float:
    """
    Generates a score based on the manually calculated indicators.
    """
    try:
        score = 0
        
        if pd.isna(row.get("Close")) or pd.isna(row.get("EMA20")) or pd.isna(row.get("EMA50")):
            return 0.0

        # --- Trend Score (EMA Crossover) ---
        if row["EMA20"] > row["EMA50"]:
            score += 30

        # --- Momentum Score (RSI) ---
        if pd.notna(row.get("RSI")):
            rsi = row["RSI"]
            if rsi < 30:
                score += 30  # Oversold (Strong Buy Signal)
            elif rsi > 70:
                score += 5   # Overbought (Weak Signal)
            else:
                score += 15  # Neutral

        # --- Volatility Score (Bollinger Bands) ---
        if pd.notna(row.get("BB_lower")):
             if row["Close"] > row["BB_lower"]:
                score += 20

        # --- Volume Score ---
        if pd.notna(row.get("Volume_Spike")):
            if row["Volume_Spike"] > 1.8:
                score += 20

        return min(score, 100.0)

    except Exception as e:
        logger.error(f"Error in generate_score for row {row.name}: {e}")
        return 0.0