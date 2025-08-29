from textblob import TextBlob
import yfinance as yf
from datetime import datetime
import logging
from typing import List, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_news(ticker: str) -> List[Dict[str, str]]:
    """
    Fetches and validates news for a given stock ticker.
    - Skips items that are missing a title or a publication time.
    - Returns an empty list if an error occurs.
    """
    try:
        stock = yf.Ticker(ticker)
        news_items = stock.news
        if not news_items:
            return []
        
        formatted_news = []
        for item in news_items[:8]:  # Process up to 8 articles
            # --- FIX: Validate news item before adding ---
            if item.get("title") and item.get("providerPublishTime"):
                formatted_news.append({
                    "title": item["title"],
                    "date": datetime.fromtimestamp(item["providerPublishTime"]).strftime("%b %d, %Y"),
                    "summary": item.get("publisher", "No publisher provided"), # Provide a better default
                    "link": item.get("link", "#")
                })
        return formatted_news
    except Exception as e:
        logger.error(f"News fetch error for {ticker}: {e}")
        # Return an empty list on error, so the frontend shows "No news available"
        return []

def analyze_sentiment(news_items: List[Dict[str, str]]) -> float:
    if not news_items: return 0.5

    # Filter out items without a title to avoid errors
    scores = [TextBlob(item["title"]).sentiment.polarity for item in news_items if item.get("title")]
    if not scores: return 0.5
    
    avg_polarity = sum(scores) / len(scores)
    # Scale polarity from [-1, 1] to [0, 1] for sentiment
    return round((avg_polarity + 1) / 2, 3)