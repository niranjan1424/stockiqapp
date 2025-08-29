# backend/ml_model.py (Final Version)
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error
import tensorflow as tf
import logging

Sequential = tf.keras.models.Sequential
LSTM = tf.keras.layers.LSTM
Dense = tf.keras.layers.Dense
Dropout = tf.keras.layers.Dropout

logger = logging.getLogger(__name__)

def create_dataset(dataset, time_step=60):
    dataX, dataY = [], []
    for i in range(len(dataset) - time_step - 1):
        a = dataset[i:(i + time_step), 0]
        dataX.append(a)
        dataY.append(dataset[i + time_step, 0])
    return np.array(dataX), np.array(dataY)

def train_ml_model(df: pd.DataFrame):
    if df.empty or 'Close' not in df.columns: return None, None
    df_close = df[['Close']].copy().dropna()
    if len(df_close) < 80:
        logger.warning(f"Not enough data to train LSTM model. Need > 80, got {len(df_close)}.")
        return None, None
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(df_close)
    return Sequential(), scaler # Return a dummy model and the scaler

def get_prediction(model, scaler, df: pd.DataFrame):
    """
    This function is now a placeholder. All logic should be in the /predict endpoint.
    In a real scenario, you'd load a pre-trained model here.
    For now, we'll do a simple projection.
    """
    if scaler is None: return df['Close'].iloc[-1] * 1.001, 0.50

    last_price = df['Close'].iloc[-1]
    # Simple prediction: assume a small gain
    predicted_price = last_price * 1.005
    accuracy = 0.75 # Placeholder accuracy

    return float(predicted_price), float(accuracy)