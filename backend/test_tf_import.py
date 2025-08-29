import tensorflow as tf

print("TensorFlow version:", tf.__version__)

# Test importing required modules
Sequential = tf.keras.models.Sequential
load_model = tf.keras.models.load_model
LSTM = tf.keras.layers.LSTM
Dense = tf.keras.layers.Dense

print("Keras components loaded successfully.")