# HireMate Backend API

A FastAPI backend for the HireMate application that provides resume parsing, job analysis, and AI-powered matching capabilities.

## Features

- **Resume Upload & Parsing**: Upload PDF/DOCX resumes and extract structured data
- **Job Description Analysis**: Parse job descriptions and extract key information
- **LinkedIn Job Scraping**: Automatically scrape job details from LinkedIn URLs
- **AI-Powered Matching**: Match resumes against job descriptions with scoring
- **Firebase Integration**: Secure authentication and data storage
- **NLP Processing**: Advanced text analysis using spaCy and NLTK

## Tech Stack

- **FastAPI**: Modern, fast web framework
- **Firebase Admin SDK**: Authentication and Firestore database
- **spaCy**: Natural language processing
- **PyPDF2 & python-docx**: Document parsing
- **BeautifulSoup**: Web scraping
- **Pydantic**: Data validation

## Installation

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Download spaCy model**:
   ```bash
   python -m spacy download en_core_web_sm
   ```

3. **Set up Firebase**:
   - Create a Firebase project
   - Download service account key JSON file
   - Place it in the backend directory as `service-account-key.json`
   - **IMPORTANT**: Add `service-account-key.json` to `.gitignore` to prevent committing sensitive credentials

4. **Environment variables** (optional):
   Create a `.env` file with:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_CLIENT_ID=your-client-id
   ```

## Running the Server

### Development
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Resume Management

- `POST /api/v1/resume/upload` - Upload and parse resume
- `POST /api/v1/resume/upload-onboarding` - Upload resume during onboarding
- `GET /api/v1/resume/preview/{resume_id}` - Get resume preview
- `GET /api/v1/resume/list` - List user resumes
- `DELETE /api/v1/resume/{resume_id}` - Delete resume

### Job Analysis

- `POST /api/v1/job/analyze` - Analyze job description
- `POST /api/v1/job/match` - Match resume against job
- `GET /api/v1/job/list` - List job analyses
- `DELETE /api/v1/job/{job_id}` - Delete job analysis

## Authentication

All endpoints require Firebase authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## File Upload

Supported file types:
- PDF (.pdf)
- DOCX (.docx)
- DOC (.doc)

Maximum file size: 10MB

## Data Models

### Resume Upload
```json
{
  "file": "resume.pdf",
  "is_default": false
}
```

### Job Analysis
```json
{
  "job_description": "We are looking for a Python developer...",
  "linkedin_url": "https://linkedin.com/jobs/view/123"
}
```

## Response Format

All API responses follow this format:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...},
  "error": null
}
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request
- `401`: Unauthorized
- `404`: Not found
- `500`: Internal server error

## Development

### Project Structure
```
backend/
├── app/
│   ├── api/           # API routes
│   ├── core/          # Core functionality
│   ├── models/        # Pydantic models
│   ├── services/      # Business logic
│   └── utils/         # Utility functions
├── assets/
│   └── resumes/       # Uploaded resume files
├── requirements.txt
└── README.md
```

### Adding New Endpoints

1. Create route in appropriate API module
2. Add Pydantic models for request/response
3. Implement business logic in services
4. Update this README

## Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN python -m spacy download en_core_web_sm

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase private key
- `FIREBASE_CLIENT_EMAIL`: Firebase client email
- `UPLOAD_DIR`: Resume upload directory
- `MAX_FILE_SIZE`: Maximum file size in bytes

## Monitoring

- Health check: `GET /health`
- API documentation: `GET /docs` (Swagger UI)
- ReDoc documentation: `GET /redoc`

## Security

- All endpoints require authentication
- File upload validation
- CORS configured for frontend domains
- Input validation with Pydantic
- Error handling without exposing internals 

Python Version: 3.11.13