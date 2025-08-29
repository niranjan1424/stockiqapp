import pandas as pd
import numpy as np
from typing import List, Dict, Any, Callable

# --- Individual Indicator Calculation Functions ---

def calculate_sma(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 20)
    df[f'SMA_{period}'] = df['Close'].rolling(window=period).mean()
    return df

def calculate_ema(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 20)
    df[f'EMA_{period}'] = df['Close'].ewm(span=period, adjust=False).mean()
    return df

def calculate_rsi(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 14)
    delta = df['Close'].diff()
    gain = delta.clip(lower=0).ewm(alpha=1/period, adjust=False).mean()
    loss = -delta.clip(upper=0).ewm(alpha=1/period, adjust=False).mean()
    rs = gain / loss
    rs.replace([np.inf, -np.inf], np.nan, inplace=True)
    df['RSI'] = 100 - (100 / (1 + rs))
    df['RSI'] = df['RSI'].fillna(50)
    return df

def calculate_macd(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    fast = params.get('fast', 12)
    slow = params.get('slow', 26)
    signal = params.get('signal', 9)
    ema_fast = df['Close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['Close'].ewm(span=slow, adjust=False).mean()
    df['MACD'] = ema_fast - ema_slow
    df['MACD_Signal'] = df['MACD'].ewm(span=signal, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
    return df

def calculate_bbands(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 20)
    std_dev = params.get('std_dev', 2)
    ma = df['Close'].rolling(window=period).mean()
    std = df['Close'].rolling(window=period).std()
    df['BB_Upper'] = ma + (std * std_dev)
    df['BB_Middle'] = ma
    df['BB_Lower'] = ma - (std * std_dev)
    return df
    
def calculate_obv(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    df['OBV'] = (np.sign(df['Close'].diff()) * df['Volume']).fillna(0).cumsum()
    return df

# --- NEW INDICATORS FROM THE LIST ---

def calculate_std_dev(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 20)
    df[f'StdDev_{period}'] = df['Close'].rolling(window=period).std()
    return df
    
def calculate_bbands_percent_b(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 20)
    std_dev = params.get('std_dev', 2)
    ma = df['Close'].rolling(window=period).mean()
    std = df['Close'].rolling(window=period).std()
    upper = ma + (std * std_dev)
    lower = ma - (std * std_dev)
    df['BB_%B'] = (df['Close'] - lower) / (upper - lower)
    return df

def calculate_dema(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 20)
    ema1 = df['Close'].ewm(span=period, adjust=False).mean()
    ema2 = ema1.ewm(span=period, adjust=False).mean()
    df[f'DEMA_{period}'] = 2 * ema1 - ema2
    return df

def calculate_ema_cross(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    fast = params.get('fast', 10)
    slow = params.get('slow', 30)
    ema_fast = df['Close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['Close'].ewm(span=slow, adjust=False).mean()
    
    # Signal: 1 for bullish cross, -1 for bearish cross
    signal = pd.Series(np.where(ema_fast > ema_slow, 1, -1), index=df.index)
    df[f'EMACross_{fast}_{slow}'] = signal.diff().fillna(0).clip(0, 1) - abs(signal.diff().fillna(0).clip(-1, 0))
    return df

def calculate_stoch_rsi(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('rsi_period', 14)
    stoch_period = params.get('stoch_period', 14)
    # Calculate RSI first
    delta = df['Close'].diff()
    gain = delta.clip(lower=0).ewm(alpha=1/period, adjust=False).mean()
    loss = -delta.clip(upper=0).ewm(alpha=1/period, adjust=False).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    # Calculate StochRSI
    min_rsi = rsi.rolling(window=stoch_period).min()
    max_rsi = rsi.rolling(window=stoch_period).max()
    df['StochRSI'] = (rsi - min_rsi) / (max_rsi - min_rsi)
    return df

def calculate_klinger(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    fast = params.get('fast', 34)
    slow = params.get('slow', 55)
    signal = params.get('signal', 13)
    
    hlc = (df['High'] + df['Low'] + df['Close']) / 3
    trend = np.sign((hlc - hlc.shift(1)).fillna(0))
    
    dm = df['High'] - df['Low']
    cm = dm.shift(1)
    
    vf = df['Volume'] * abs(2 * (dm / cm) - 1) * trend * 100
    
    ema_fast = vf.ewm(span=fast, adjust=False).mean()
    ema_slow = vf.ewm(span=slow, adjust=False).mean()
    
    df['Klinger'] = ema_fast - ema_slow
    df['Klinger_Signal'] = df['Klinger'].ewm(span=signal, adjust=False).mean()
    return df

def calculate_lin_reg_curve(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    period = params.get('period', 14)
    
    def get_lin_reg(data):
        x = np.arange(len(data))
        m, b = np.polyfit(x, data, 1)
        return m * (len(data) - 1) + b
        
    df[f'LinReg_{period}'] = df['Close'].rolling(window=period).apply(get_lin_reg, raw=True)
    return df

def calculate_tsi(df: pd.DataFrame, params: Dict) -> pd.DataFrame:
    r = params.get('long', 25)
    s = params.get('short', 13)
    
    m = df['Close'].diff(1)
    abs_m = abs(m)
    
    ema1 = m.ewm(span=r, adjust=False).mean()
    ema2 = ema1.ewm(span=s, adjust=False).mean()
    
    abs_ema1 = abs_m.ewm(span=r, adjust=False).mean()
    abs_ema2 = abs_ema1.ewm(span=s, adjust=False).mean()
    
    df['TSI'] = 100 * (ema2 / abs_ema2)
    return df

# --- Main Dynamic Calculation Function ---

INDICATOR_FUNCTIONS: Dict[str, Callable[[pd.DataFrame, Dict], pd.DataFrame]] = {
    "SMA": calculate_sma,
    "EMA": calculate_ema,
    "RSI": calculate_rsi,
    "MACD": calculate_macd,
    "BBands": calculate_bbands,
    "OBV": calculate_obv,
    "StdDev": calculate_std_dev,
    "BBands_%B": calculate_bbands_percent_b,
    "DEMA": calculate_dema,
    "EMACross": calculate_ema_cross,
    "StochRSI": calculate_stoch_rsi,
    "Klinger": calculate_klinger,
    "LinReg": calculate_lin_reg_curve,
    "TSI": calculate_tsi
}

def calculate_indicators(df: pd.DataFrame, indicators_to_calc: List[Dict[str, Any]]) -> pd.DataFrame:
    if df.empty or "Close" not in df.columns:
        return df

    df_out = df.copy()

    for indicator in indicators_to_calc:
        name = indicator.get("name")
        params = indicator.get("params", {})
        
        calculation_function = INDICATOR_FUNCTIONS.get(str(name))
        
        if name and calculation_function:
            try:
                df_out = calculation_function(df_out, params)
            except Exception as e:
                print(f"Error calculating indicator '{name}': {e}")
    
    return df_out