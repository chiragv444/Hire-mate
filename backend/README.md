# HireMate Backend

A lightweight FastAPI backend for the HireMate job application AI platform, now powered by LangChain + OpenAI instead of heavy ML libraries.

## 🚀 Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **Firebase Integration**: Authentication, Firestore database, and Firebase Storage
- **AI-Powered Analysis**: Resume parsing and job matching using LangChain + OpenAI
- **File Upload**: Resume upload and storage in Firebase Storage
- **User Management**: Authentication and user profile management

## 🏗️ Architecture

```
backend/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── analysis.py         # Analysis flow endpoints
│   │   ├── analytics_new.py    # New analytics system
│   │   ├── job.py             # Job analysis endpoints
│   │   ├── onboarding.py      # User onboarding
│   │   └── resume.py          # Resume management
│   ├── core/                   # Core functionality
│   │   ├── auth.py            # Authentication middleware
│   │   ├── config.py          # Configuration settings
│   │   └── firebase.py        # Firebase service
│   ├── models/                 # Pydantic data models
│   ├── services/               # Business logic services
│   │   ├── enhanced_job_parser.py      # AI-powered job parsing
│   │   ├── enhanced_resume_analyzer.py # AI-powered resume analysis
│   │   ├── enhanced_resume_parser.py   # AI-powered resume parsing
│   │   ├── firebase_simple.py          # Simplified Firebase operations
│   │   └── firebase_storage.py        # File storage operations
│   └── utils/                  # Utility functions
├── requirements.txt            # Python dependencies
├── setup.py                   # Setup script
├── run.py                     # Application entry point
└── Dockerfile                 # Docker configuration
```

## 🔧 Setup

### Prerequisites

- Python 3.8+
- Firebase project with service account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hiremate-ui-kit/backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Add your configuration
   OPENAI_API_KEY=your_openai_api_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   ```

4. **Set up Firebase service account**
   - Download your Firebase service account key
   - Place it in the project root as `service-account-key.json`

5. **Run the application**
   ```bash
   python run.py
   ```

## 📚 API Endpoints

### Analysis Flow
- `POST /analysis/start` - Start new analysis with resume upload
- `POST /analysis/job-input` - Add job description to analysis
- `POST /analysis/match` - Perform resume-job matching

### Resume Management
- `POST /resume/upload` - Upload and parse resume
- `GET /resume/list` - List user's resumes
- `DELETE /resume/{id}` - Delete resume

### Job Analysis
- `POST /job/analyze` - Analyze job description
- `POST /job/match` - Match resume against job
- `GET /job/list` - List user's job analyses

### Onboarding
- `POST /onboarding/upload-resume` - Upload resume during onboarding
- `GET /onboarding/default-resume` - Get user's default resume

## 🧠 AI Integration

The backend now uses **LangChain + OpenAI** for intelligent resume and job analysis:

- **Resume Parsing**: AI-powered extraction of skills, experience, and qualifications
- **Job Analysis**: Intelligent parsing of job descriptions and requirements
- **Matching Algorithm**: AI-driven resume-job compatibility scoring
- **ATS Optimization**: AI-powered suggestions for ATS-friendly resume improvements

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t hiremate-backend .

# Run container
docker run -p 8000:8000 hiremate-backend
```

## 🔒 Security

- JWT-based authentication
- Firebase security rules
- Input validation with Pydantic
- File type and size validation

## 📝 Notes

- **Heavy ML libraries removed**: No more spaCy, NLTK, scikit-learn, etc.
- **Lightweight**: Focused on essential dependencies for production
- **AI-ready**: Prepared for LangChain + OpenAI integration
- **Scalable**: Firebase-based architecture for easy scaling

## 🚧 Future Enhancements

- Complete LangChain + OpenAI integration
- Advanced AI-powered analysis
- Real-time collaboration features
- Enhanced security measures
- Performance optimizations