# HireMate Backend

This is the backend service for HireMate, a resume-job matching platform.

## Features

- Resume parsing and analysis
- Job description parsing
- AI-powered resume-job matching
- Firebase integration for data storage
- RESTful API endpoints

## Trained Model Integration

The backend now includes integration with a fine-tuned DistilBERT model for resume-job matching. This model provides:

- **Fit Level Prediction**: "Not Fit", "Possible Fit", or "Great Fit"
- **Confidence Score**: Percentage-based confidence (0-100%)
- **Asynchronous Processing**: Runs in background without blocking the main analysis

### Model Location

The trained model is located in `model_integration/fine_tuned_distilbert_model/` and includes:
- `model.safetensors` - The trained model weights
- `tokenizer.json` - Tokenizer configuration
- `config.json` - Model configuration

### Usage

The model is automatically called during the `/perform-analysis` endpoint and stores results in the `trained_model_results` field of the analytics document.

### Testing

Run the test script to verify model integration:

```bash
cd backend
python test_trained_model.py
```

## API Endpoints

### Analytics
- `POST /analytics/create` - Create new analytics from job description
- `POST /analytics/upload-resume` - Upload resume for analysis
- `POST /analytics/perform-analysis` - Perform analysis (includes trained model)
- `GET /analytics/history` - Get user's analytics history
- `GET /analytics/{id}` - Get specific analytics details

### Resume Management
- `GET /analytics/resumes/list` - Get user's resumes
- `POST /analytics/resumes/set-default` - Set default resume
- `GET /analytics/resumes/default` - Get user's default resume

## Setup

1. **Activate the correct conda environment:**
```bash
conda activate py311
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. **Start the server (IMPORTANT: Use the py311 environment):**
```bash
# Option 1: Use the startup script (recommended)
python start_server.py

# Option 2: Manual startup
conda activate py311
python run.py
```

**⚠️ Important:** The trained model requires NumPy 1.x and specific versions of PyTorch/Transformers. 
Always ensure you're in the `py311` conda environment before starting the server.

## Docker

Build and run with Docker:

```