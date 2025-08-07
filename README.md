# HireMate - AI-Powered Resume Matching Platform

HireMate is a comprehensive full-stack application that helps job seekers match their resumes with job descriptions using AI-powered analysis.

## 🚀 Features

- **Resume Upload & Parsing**: Upload PDF/DOCX resumes and extract structured data
- **Job Description Analysis**: Parse job descriptions and extract key information
- **LinkedIn Job Scraping**: Automatically scrape job details from LinkedIn URLs
- **AI-Powered Matching**: Match resumes against job descriptions with scoring
- **Firebase Integration**: Secure authentication and data storage
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## 🏗️ Tech Stack

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Firebase SDK** for authentication and data

### Backend
- **FastAPI** with Python 3.11.13
- **Firebase Admin SDK** for authentication and Firestore
- **spaCy** for natural language processing
- **PyPDF2 & python-docx** for document parsing
- **BeautifulSoup** for web scraping

## 🐳 Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Firebase project with service account key

### Setup
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd hiremate-ui-kit
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

3. **Add Firebase service account key**
   - Download your Firebase service account key JSON file
   - Place it at `backend/service-account-key.json`

4. **Run the setup script**
   ```bash
   ./docker-setup.sh
   ```

### Manual Docker Setup
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🌐 Access Points

- **Frontend**: http://localhost:4000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🛠️ Development Setup

### Frontend Development
```bash
cd frontend
npm install
cp ../.env.example .env
# Edit .env with your Firebase credentials
npm run dev
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python setup.py
python run.py
```

## 📁 Project Structure

```
hiremate-ui-kit/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configs
│   │   └── types/          # TypeScript type definitions
│   ├── Dockerfile          # Frontend Docker configuration
│   └── nginx.conf          # Nginx configuration for production
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core functionality
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── assets/             # File uploads
│   ├── Dockerfile          # Backend Docker configuration
│   ├── requirements.txt    # Python dependencies
│   ├── setup.py           # Setup script
│   └── run.py             # Application entry point
├── docker-compose.yml      # Docker orchestration
├── docker-setup.sh        # Automated setup script
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Backend
- Place Firebase service account key at `backend/service-account-key.json`
- Additional backend environment variables can be added to `.env`

## 🔒 Security

- Environment variables are used for all sensitive configuration
- Firebase service account keys are excluded from version control
- CORS is properly configured for frontend domains
- Input validation with Pydantic models
- Secure file upload handling

## 📚 API Documentation

The backend provides comprehensive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🚀 Deployment

The application is containerized and ready for deployment to any Docker-compatible platform:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Self-hosted with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker setup
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the API documentation at `/docs`
- Review the setup instructions in individual README files
- Ensure all environment variables are properly configured
