import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { auth } from "@/lib/firebase";
// Real API functions for Hire Mate SaaS - FastAPI Backend Integration

// Backend API configuration
const API_BASE_URL = "http://localhost:8000/api/v1";

// Create an axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add interceptor to include auth token in every request
axiosInstance.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    console.log('User is authenticated', user); 
    const idToken = await user.getIdToken();
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
});

// Helper function to get auth token from localStorage
// function getAuthToken(): string | null {
//   const { idToken } = useAuth();
//   console.log('Using ID Token:::::::::::::::', idToken);
//   if (idToken) {
//     return idToken;
//   }
//   return null;
//   //   return localStorage.getItem('firebase-token');
// }

// Helper function to make authenticated API requests
async function apiRequest(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<any> {
  try {
    const response = await axiosInstance({
      url: endpoint,
      ...options,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data || { error: "Network error" };
      throw new Error(
        errorData.error || errorData.detail || `HTTP ${error.response.status}`
      );
    }
    throw error;
  }
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  createdAt: string;
}

export interface OnboardingData {
  currentStatus: string;
  industry: string;
  careerPath: string;
  experienceLevel: string;
  userGoals: string[];
  userNote?: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeName: string;
  jobTitle: string;
  matchScore: number;
  atsScore: number;
  fitLevel: "Not Fit" | "Possible Fit" | "Great Fit";
  missingKeywords: string[];
  suggestions: string[];
  createdAt: string;
}

export interface JobDescription {
  title: string;
  company: string;
  location: string;
  skills: string[];
  keywords: string[];
}

export interface CoverLetter {
  content: string;
  generatedAt: string;
}

// Auth APIs
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (email === "demo@hiremate.me" && password === "password") {
    return {
      success: true,
      user: {
        id: "1",
        email: "demo@hiremate.me",
        fullName: "Demo User",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
        createdAt: new Date().toISOString(),
      },
    };
  }

  return { success: false, error: "Invalid credentials" };
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    success: true,
    user: {
      id: Math.random().toString(36).substring(2, 9),
      email,
      fullName,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function resetPassword(
  email: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    success: true,
    message: "Password reset link sent to your email",
  };
}

// Onboarding API
export async function saveOnboardingData(
  data: OnboardingData
): Promise<{ success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true };
}

// Resume APIs - New Analysis Flow
export async function uploadResume(
  file: File
): Promise<{
  success: boolean;
  parsedText?: string;
  error?: string;
  analysisId?: string;
  resumeId?: string;
  preview?: any;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post("/analysis/start", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const data = response.data;

    return {
      success: data.success,
      parsedText: data.preview?.parsed_text || "",
      analysisId: data.analysis_id,
      resumeId: data.resume_id,
      preview: data.preview,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

// Upload resume during onboarding flow
export async function uploadResumeOnboarding(
  file: File
): Promise<{ success: boolean; parsedText?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
      "/resume/upload-onboarding",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const data = response.data;

    return {
      success: data.success,
      parsedText: data.parsed_data?.raw_text || "",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

// Job Description APIs - New Analysis Flow
export async function parseJobDescription(
  text: string,
  linkedinUrl?: string,
  analysisId?: string
): Promise<{
  success: boolean;
  jobId?: string;
  parsedResults?: any;
  error?: string;
}> {
  try {
    const requestData = {
      job_description: text,
      ...(linkedinUrl && { linkedin_url: linkedinUrl }),
      ...(analysisId && { analysis_id: analysisId }),
    };

    const data = await apiRequest("/analysis/job-input", {
      method: "post",
      data: requestData,
    });

    return {
      success: data.success,
      jobId: data.job_id,
      parsedResults: data.parsed_results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Job analysis failed",
    };
  }
}

// Legacy function for backward compatibility
export async function parseJobDescriptionLegacy(
  text: string,
  linkedinUrl?: string
): Promise<JobDescription> {
  const result = await parseJobDescription(text, linkedinUrl);

  if (!result.success || !result.parsedResults) {
    // Return fallback data
    return {
      title: "Job Title",
      company: "Company",
      location: "Location",
      skills: [],
      keywords: [],
    };
  }

  const parsed = result.parsedResults;
  return {
    title: parsed.basic_info?.title || "Job Title",
    company: parsed.basic_info?.company || "Company",
    location: parsed.basic_info?.location || "Location",
    skills: parsed.skills || [],
    keywords: parsed.keywords || [],
  };
}

// Analysis APIs - New Analysis Flow
export async function performAnalysisMatch(
  resumeId: string,
  jobId: string,
  analysisId?: string
): Promise<{
  success: boolean;
  matchId?: string;
  results?: any;
  error?: string;
}> {
  try {
    const requestData = {
      resume_id: resumeId,
      job_id: jobId,
      ...(analysisId && { analysis_id: analysisId }),
    };

    const data = await apiRequest("/analysis/match", {
      method: "post",
      data: requestData,
    });

    return {
      success: data.success,
      matchId: data.match_id,
      results: data.results,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Analysis matching failed",
    };
  }
}

// Legacy function for backward compatibility
export async function getMatchScore(
  resumeText: string,
  jobDescription: JobDescription
): Promise<ResumeAnalysis> {
  // For backward compatibility, we'll return mock data
  // In a real implementation, you'd need resumeId and jobId to call the new API

  const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100 range
  const atsScore = Math.min(
    mockScore + Math.floor(Math.random() * 10) - 5,
    100
  );

  let fitLevel: "Not Fit" | "Possible Fit" | "Great Fit";
  if (mockScore >= 80) fitLevel = "Great Fit";
  else if (mockScore >= 60) fitLevel = "Possible Fit";
  else fitLevel = "Not Fit";

  return {
    id: Math.random().toString(36).substring(2, 9),
    resumeName: "Current Resume",
    jobTitle: jobDescription.title,
    matchScore: mockScore,
    atsScore,
    fitLevel,
    missingKeywords: jobDescription.skills.slice(0, 3),
    suggestions: [
      "Highlight relevant experience more prominently",
      "Add quantifiable achievements",
      "Include industry-specific keywords",
      "Optimize for ATS scanning",
    ],
    createdAt: new Date().toISOString(),
  };
}

// Cover Letter APIs
export async function generateCoverLetter(
  jobDescription: JobDescription,
  resumeText: string
): Promise<CoverLetter> {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return {
    content: `Dear Hiring Manager,

I am writing to express my strong interest in the ${
      jobDescription.title
    } position at ${
      jobDescription.company
    }. With my extensive background in frontend development and proven track record of delivering high-quality web applications, I am confident that I would be a valuable addition to your team.

In my current role as a Senior Software Engineer, I have successfully:

• Led the development of responsive web applications using React and TypeScript, serving over 100,000 daily active users
• Implemented modern state management solutions and optimized application performance, resulting in 40% faster load times  
• Collaborated with cross-functional teams to deliver projects on time and within budget
• Mentored junior developers and established best practices for code quality and testing

Your job posting particularly caught my attention because of the emphasis on ${jobDescription.skills
      .slice(0, 2)
      .join(
        " and "
      )}. These technologies align perfectly with my expertise, and I have used them extensively in recent projects to build scalable, maintainable applications.

I am excited about the opportunity to bring my technical skills and passion for creating exceptional user experiences to ${
      jobDescription.company
    }. I would welcome the chance to discuss how my background and enthusiasm can contribute to your team's continued success.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
Demo User`,
    generatedAt: new Date().toISOString(),
  };
}

// Job Suggestions API
export async function getJobSuggestions(): Promise<
  Array<{ title: string; company: string; score: number; location: string }>
> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return [
    {
      title: "Senior React Developer",
      company: "TechFlow",
      score: 94,
      location: "Remote",
    },
    {
      title: "Frontend Architect",
      company: "DataSys Inc.",
      score: 91,
      location: "San Francisco",
    },
    {
      title: "Lead UI Engineer",
      company: "CloudTech",
      score: 89,
      location: "Seattle",
    },
    {
      title: "Full Stack Developer",
      company: "InnovateLabs",
      score: 87,
      location: "New York",
    },
    {
      title: "React/TypeScript Developer",
      company: "WebCorp",
      score: 85,
      location: "Austin",
    },
  ];
}

// Workspace APIs
export async function getAnalysisHistory(): Promise<ResumeAnalysis[]> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockAnalyses: ResumeAnalysis[] = [
    {
      id: "1",
      resumeName: "Software_Engineer_Resume.pdf",
      jobTitle: "Senior Frontend Developer",
      matchScore: 89,
      atsScore: 85,
      fitLevel: "Great Fit",
      missingKeywords: ["Docker", "AWS"],
      suggestions: ["Add cloud experience", "Include Docker skills"],
      createdAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      resumeName: "John_Doe_Resume_v2.pdf",
      jobTitle: "Full Stack Engineer",
      matchScore: 76,
      atsScore: 82,
      fitLevel: "Possible Fit",
      missingKeywords: ["PostgreSQL", "GraphQL", "Microservices"],
      suggestions: ["Add database experience", "Include API design skills"],
      createdAt: "2024-01-14T14:22:00Z",
    },
    {
      id: "3",
      resumeName: "Resume_Updated.pdf",
      jobTitle: "React Developer",
      matchScore: 92,
      atsScore: 88,
      fitLevel: "Great Fit",
      missingKeywords: ["Jest", "Cypress"],
      suggestions: ["Add testing frameworks", "Include automation experience"],
      createdAt: "2024-01-12T09:15:00Z",
    },
    {
      id: "4",
      resumeName: "My_Resume_Final.pdf",
      jobTitle: "Frontend Architect",
      matchScore: 68,
      atsScore: 74,
      fitLevel: "Not Fit",
      missingKeywords: ["Leadership", "System Design", "Architecture"],
      suggestions: [
        "Add leadership experience",
        "Include system design projects",
      ],
      createdAt: "2024-01-10T16:45:00Z",
    },
  ];

  return mockAnalyses;
}

// Profile APIs
export async function updateProfile(data: {
  fullName: string;
  avatar?: string;
}): Promise<{ success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true };
}

export async function uploadAvatar(
  file: File
): Promise<{ success: boolean; avatarUrl?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    success: true,
    avatarUrl: URL.createObjectURL(file),
  };
}

// New Analysis Flow APIs
export async function startAnalysis(
  file: File
): Promise<{ success: boolean; analysis_id?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiRequest('/analysis/start', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      analysis_id: response.analysis_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start analysis',
    };
  }
}

export async function submitJobDescription(
  analysisId: string,
  jobDescription: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest('/analysis/job-input', {
      method: 'POST',
      data: {
        analysis_id: analysisId,
        job_description: jobDescription,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit job description',
    };
  }
}

export async function performMatch(
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest('/analysis/match', {
      method: 'POST',
      data: {
        analysis_id: analysisId,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform analysis',
    };
  }
}

export async function getAnalysisResults(
  analysisId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await apiRequest(`/analysis/results/${analysisId}`, {
      method: 'GET',
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analysis results',
    };
  }
}
