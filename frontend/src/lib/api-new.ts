import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { auth } from "@/lib/firebase";

// New simplified API functions for the updated backend schema

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
    const idToken = await user.getIdToken();
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
});

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

// Types for the new API
export interface JobDescriptionData {
  title?: string;
  company?: string;
  location?: string;
  description: string;
  linkedin_url?: string;
  parsed_skills: string[];
  parsed_requirements: string[];
  parsed_responsibilities: string[];
  parsed_qualifications: string[];
  keywords: string[];
}

export interface ResumeData {
  resume_id?: string;
  filename?: string;
  original_name?: string;
  type: string;
  parsed_data: any;
}

export interface AnalysisResults {
  match_score?: number;
  ats_score?: number;
  fit_level?: string;
  matching_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  improvements: string[];
  total_skills_matched?: number;
  total_skills_missing?: number;
  skill_match_percentage?: number;
}

export interface Analytics {
  id?: string;
  user_id: string;
  job_description?: JobDescriptionData;
  resume?: ResumeData;
  results?: AnalysisResults;
  status: string;
  created_at: string;
  updated_at?: string;
}

// New Analytics Flow API Functions

export async function createAnalytics(
  jobDescription: string,
  linkedinUrl?: string
): Promise<{ success: boolean; analytics_id?: string; parsed_job?: JobDescriptionData; error?: string }> {
  try {
    const response = await apiRequest('/analytics/create', {
      method: 'POST',
      data: {
        job_description: jobDescription,
        linkedin_url: linkedinUrl,
      },
    });

    return {
      success: true,
      analytics_id: response.analytics_id,
      parsed_job: response.parsed_job,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create analytics',
    };
  }
}

export async function uploadResumeForAnalytics(
  file: File,
  analyticsId?: string
): Promise<{ success: boolean; resume_id?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (analyticsId) {
      formData.append('analytics_id', analyticsId);
    }

    const response = await apiRequest('/analytics/upload-resume', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      resume_id: response.resume_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload resume',
    };
  }
}

export async function addExistingResumeToAnalytics(
  analyticsId: string,
  resumeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest('/analytics/add-resume', {
      method: 'POST',
      data: {
        analytics_id: analyticsId,
        resume_id: resumeId,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add resume to analytics',
    };
  }
}

export async function performAnalysis(
  analyticsId: string
): Promise<{ success: boolean; results?: AnalysisResults; error?: string }> {
  try {
    const response = await apiRequest('/analytics/perform-analysis', {
      method: 'POST',
      data: {
        analytics_id: analyticsId,
      },
    });

    return {
      success: true,
      results: response.results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform analysis',
    };
  }
}

export async function getAnalyticsHistory(): Promise<{ success: boolean; analytics?: Analytics[]; error?: string }> {
  try {
    const response = await apiRequest('/analytics/history', {
      method: 'GET',
    });

    return {
      success: true,
      analytics: response.analytics,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics history',
    };
  }
}

export async function getAnalyticsDetails(
  analyticsId: string
): Promise<{ success: boolean; analytics?: Analytics; error?: string }> {
  try {
    const response = await apiRequest(`/analytics/${analyticsId}`, {
      method: 'GET',
    });

    return {
      success: true,
      analytics: response.analytics,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics details',
    };
  }
}

// Resume Management Functions

export async function getUserResumes(): Promise<{ success: boolean; resumes?: any[]; error?: string }> {
  try {
    const response = await apiRequest('/analytics/resumes/list', {
      method: 'GET',
    });

    return {
      success: true,
      resumes: response.resumes,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get resumes',
    };
  }
}

export async function getDefaultResume(): Promise<{ success: boolean; resume?: any; error?: string }> {
  try {
    const response = await apiRequest('/analytics/resumes/default', {
      method: 'GET',
    });

    return {
      success: true,
      resume: response.resume,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get default resume',
    };
  }
}

export async function setDefaultResume(
  resumeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest('/analytics/resumes/set-default', {
      method: 'POST',
      data: {
        resume_id: resumeId,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set default resume',
    };
  }
}
