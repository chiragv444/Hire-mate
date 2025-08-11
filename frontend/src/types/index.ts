// Global types for Hire Mate application

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt?: string;
  onboardingCompleted?: boolean;
}

export interface OnboardingData {
  currentStatus: string;
  industry: string;
  careerPath: string;
  experienceLevel: string;
  userGoals: string[];
  userNote?: string;
  resumeFile?: File;
  resumeData?: any;
}

export interface JobDescription {
  title: string;
  company: string;
  location: string;
  skills: string[];
  keywords: string[];
  description?: string;
  linkedinUrl?: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeName: string;
  jobTitle: string;
  company?: string;
  matchScore: number;
  atsScore: number;
  fitLevel: 'Not Fit' | 'Possible Fit' | 'Great Fit';
  missingKeywords: string[];
  suggestions: string[];
  feedback?: {
    strengths: string[];
    improvements: string[];
    keywords: {
      found: string[];
      missing: string[];
    };
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CoverLetter {
  id?: string;
  content: string;
  jobTitle?: string;
  company?: string;
  generatedAt: string;
  isCustom?: boolean;
}

export interface JobSuggestion {
  id?: string;
  title: string;
  company: string;
  location: string;
  score: number;
  matchReason?: string;
  url?: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface AnalysisFilters {
  fitLevel?: 'Not Fit' | 'Possible Fit' | 'Great Fit' | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
  minScore?: number;
  maxScore?: number;
  sortBy?: 'date' | 'score' | 'atsScore';
  sortOrder?: 'asc' | 'desc';
}

export interface AnalysisStats {
  totalAnalyses: number;
  averageScore: number;
  averageAtsScore: number;
  fitDistribution: {
    'Not Fit': number;
    'Possible Fit': number;
    'Great Fit': number;
  };
  topSkills: Array<{
    skill: string;
    frequency: number;
  }>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  message?: string;
}

export interface FileUploadState extends LoadingState {
  progress?: number;
  file?: File;
  preview?: string;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileFormData {
  fullName: string;
  email: string;
}

export interface JobInputFormData {
  jobDescription: string;
  linkedinUrl?: string;
}

export interface CoverLetterFormData {
  content: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface AnalysisCardProps {
  analysis: ResumeAnalysis;
  onView?: (analysis: ResumeAnalysis) => void;
  onDelete?: (analysisId: string) => void;
  showActions?: boolean;
}

export interface ScoreDisplayProps {
  score: number;
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

// Hook types
export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface UseAnalysisReturn {
  analyses: ResumeAnalysis[];
  stats: AnalysisStats;
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  createAnalysis: (resumeFile: File, jobDescription: JobDescription) => Promise<ResumeAnalysis>;
  deleteAnalysis: (analysisId: string) => Promise<void>;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<any>;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
}

export interface SidebarItem extends NavItem {
  children?: NavItem[];
  isCollapsible?: boolean;
  defaultOpen?: boolean;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// Analytics/Tracking types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
}