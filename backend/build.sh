#!/bin/bash

# Exit on any error
set -e

# Install Python dependencies
pip install -r requirements.txt

# Download necessary NLTK data for TextBlob
python -m textblob.download_corpora