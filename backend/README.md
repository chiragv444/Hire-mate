# HireMate Backend API

A FastAPI-based backend service for the HireMate application, providing resume parsing, job analysis, and AI-powered matching capabilities.

## 🚀 Features

- **Resume Parsing**: Advanced resume parsing with AI-powered text extraction
- **Job Analysis**: LinkedIn job scraping and job description analysis
- **AI Matching**: Intelligent resume-to-job matching using enhanced algorithms
- **Firebase Integration**: Firestore database and Firebase Storage for file management
- **Authentication**: Firebase Auth integration with JWT token verification
- **File Management**: Resume uploads stored in Firebase Storage (gs://hire-mate.firebasestorage.app/resumes)

## 🏗️ Architecture

- **FastAPI**: Modern, fast web framework for building APIs
- **Firebase Admin SDK**: Authentication, Firestore database, and Storage
- **AI/ML**: Enhanced resume parsing and analysis using LangChain and OpenAI
- **NLP**: Text processing with spaCy, NLTK, and custom algorithms
- **Docker**: Containerized deployment with multi-stage builds

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/                 # API endpoints
│   │   ├── analysis.py      # Resume analysis endpoints
│   │   ├── analytics_new.py # New analytics flow endpoints
│   │   ├── onboarding.py    # User onboarding endpoints
│   │   └── resume.py        # Resume management endpoints
│   ├── core/                # Core configuration and services
│   │   ├── auth.py          # Authentication middleware
│   │   ├── config.py        # Configuration settings
│   │   └── firebase.py      # Firebase service
│   ├── models/              # Pydantic data models
│   ├── services/            # Business logic services
│   │   ├── firebase_storage.py # Firebase Storage service
│   │   ├── firebase_simple.py  # Simplified Firebase service
│   │   ├── enhanced_resume_parser.py # AI-powered resume parsing
│   │   └── resume_parser.py # Basic resume parsing
│   └── utils/               # Utility functions
├── assets/                  # Local assets (legacy - now using Firebase Storage)
├── uploads/                 # Local uploads (legacy - now using Firebase Storage)
├── Dockerfile               # Docker configuration
├── requirements.txt          # Python dependencies
└── run.py                   # Application entry point
```

## 🔧 Setup & Installation

### Prerequisites

- Python 3.11+
- Firebase project with Firestore and Storage enabled
- Firebase service account key

### 1. Clone and Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Firebase Configuration

#### Option A: Service Account Key File
1. Download your Firebase service account key from Firebase Console
2. Save it as `service-account-key.json` in the backend directory
3. Ensure the key has permissions for Firestore and Storage

#### Option B: Environment Variables
Set the following environment variables:
```bash
export FIREBASE_PROJECT_ID="hire-mate"
export FIREBASE_PRIVATE_KEY_ID="your_private_key_id"
export FIREBASE_PRIVATE_KEY="your_private_key"
export FIREBASE_CLIENT_EMAIL="your_client_email"
export FIREBASE_CLIENT_ID="your_client_id"
export FIREBASE_CLIENT_X509_CERT_URL="your_cert_url"
```

### 3. Run Setup Script

```bash
python setup.py
```

This will:
- Install Python dependencies
- Download required NLP models (spaCy, NLTK)
- Configure the application

### 4. Start the Application

```bash
python run.py
```

The API will be available at `http://localhost:8000`

## 🗄️ Firebase Storage Integration

### File Storage
- **Resumes**: All resume files are now stored in Firebase Storage
- **Location**: `gs://hire-mate.firebasestorage.app/resumes/`
- **Benefits**: 
  - Scalable cloud storage
  - Automatic CDN distribution
  - Secure access control
  - No local disk space usage

### File Management
- Files are uploaded with unique UUIDs
- Signed URLs are generated for secure access
- Automatic cleanup when resumes are deleted
- Support for PDF, DOCX, and DOC files

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/verify` - Verify Firebase ID token

### Resume Management
- `POST /api/v1/resume/upload` - Upload and parse resume
- `POST /api/v1/resume/upload-onboarding` - Upload resume during onboarding
- `GET /api/v1/resume/preview/{resume_id}` - Get resume preview
- `GET /api/v1/resume/list` - List user's resumes
- `DELETE /api/v1/resume/{resume_id}` - Delete resume

### Analytics
- `POST /api/v1/analytics/create` - Create new analytics session
- `POST /api/v1/analytics/upload-resume` - Upload resume for analytics
- `POST /api/v1/analytics/perform-analysis` - Perform resume-job analysis
- `GET /api/v1/analytics/history` - Get analytics history

### Onboarding
- `POST /api/v1/onboarding/upload-resume` - Upload resume during onboarding
- `GET /api/v1/onboarding/default-resume` - Get user's default resume

## 🧪 Testing

### Test Firebase Storage Integration

```bash
python test_firebase_storage.py
```

This will test:
- Firebase initialization
- Storage bucket access
- File upload/download
- File deletion

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t hiremate-backend .

# Run the container
docker run -p 8000:8000 hiremate-backend
```

### Environment Variables
Set Firebase configuration as environment variables when running in Docker:

```bash
docker run -p 8000:8000 \
  -e FIREBASE_PROJECT_ID="hire-mate" \
  -e FIREBASE_PRIVATE_KEY_ID="your_key_id" \
  -e FIREBASE_PRIVATE_KEY="your_private_key" \
  -e FIREBASE_CLIENT_EMAIL="your_client_email" \
  hiremate-backend
```

## 🔒 Security

- **Authentication**: Firebase Auth with JWT token verification
- **File Access**: Signed URLs with expiration for secure file access
- **CORS**: Configured for frontend domains
- **File Validation**: File type and size validation
- **User Isolation**: Users can only access their own data

## 📈 Performance

- **File Processing**: Asynchronous file upload and parsing
- **Storage**: Cloud-based storage with CDN distribution
- **Database**: Firestore for scalable document storage
- **Caching**: Intelligent caching for parsed resume data

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Initialization Error**
   - Check service account key file or environment variables
   - Verify Firebase project ID is correct

2. **File Upload Failures**
   - Check Firebase Storage permissions
   - Verify bucket name configuration

3. **Authentication Errors**
   - Ensure Firebase Auth is enabled
   - Check token expiration and validity

### Logs
Check application logs for detailed error information:
```bash
docker logs <container_id>
```

## 🔄 Migration from Local Storage

If you're migrating from the previous local storage system:

1. **Data Migration**: Existing local files remain accessible
2. **New Uploads**: All new files go to Firebase Storage
3. **Database**: File paths are updated to Firebase Storage URLs
4. **Cleanup**: Local assets directory can be removed after migration

## 📝 License

This project is part of the HireMate application suite.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review Firebase documentation
- Open an issue in the repository