// App constants for Hire Mate

export const APP_NAME = "Hire Mate";
export const APP_DESCRIPTION = "Transform your job applications with AI precision";
export const APP_URL = "app.hiremate.me";

// Onboarding options
export const CURRENT_STATUS_OPTIONS = [
  { value: "actively-looking", label: "Actively looking for new opportunities" },
  { value: "passively-open", label: "Passively open to opportunities" },
  { value: "employed-happy", label: "Employed and happy" },
  { value: "student", label: "Student" },
  { value: "career-change", label: "Looking to change careers" },
  { value: "freelancer", label: "Freelancer/Contractor" },
];

export const INDUSTRY_OPTIONS = [
  { value: "technology", label: "Technology & Software" },
  { value: "healthcare", label: "Healthcare & Medical" },
  { value: "finance", label: "Finance & Banking" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "design", label: "Design & Creative" },
  { value: "sales", label: "Sales & Business Development" },
  { value: "education", label: "Education & Training" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "consulting", label: "Consulting" },
  { value: "manufacturing", label: "Manufacturing & Operations" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "real-estate", label: "Real Estate" },
  { value: "media", label: "Media & Communications" },
  { value: "nonprofit", label: "Non-profit & Social Impact" },
  { value: "other", label: "Other" },
];

export const CAREER_PATHS_BY_INDUSTRY: Record<string, Array<{ value: string; label: string }>> = {
  technology: [
    { value: "frontend-dev", label: "Frontend Developer" },
    { value: "backend-dev", label: "Backend Developer" },
    { value: "fullstack-dev", label: "Full Stack Developer" },
    { value: "mobile-dev", label: "Mobile Developer" },
    { value: "devops", label: "DevOps Engineer" },
    { value: "data-scientist", label: "Data Scientist" },
    { value: "product-manager", label: "Product Manager" },
    { value: "ui-ux-designer", label: "UI/UX Designer" },
    { value: "qa-engineer", label: "QA Engineer" },
    { value: "security-engineer", label: "Security Engineer" },
    { value: "tech-lead", label: "Technical Lead" },
    { value: "solutions-architect", label: "Solutions Architect" },
  ],
  design: [
    { value: "graphic-designer", label: "Graphic Designer" },
    { value: "ui-designer", label: "UI Designer" },
    { value: "ux-designer", label: "UX Designer" },
    { value: "product-designer", label: "Product Designer" },
    { value: "visual-designer", label: "Visual Designer" },
    { value: "motion-designer", label: "Motion Designer" },
    { value: "brand-designer", label: "Brand Designer" },
    { value: "creative-director", label: "Creative Director" },
  ],
  marketing: [
    { value: "digital-marketer", label: "Digital Marketer" },
    { value: "content-marketer", label: "Content Marketer" },
    { value: "social-media", label: "Social Media Manager" },
    { value: "seo-specialist", label: "SEO Specialist" },
    { value: "growth-marketer", label: "Growth Marketer" },
    { value: "brand-manager", label: "Brand Manager" },
    { value: "marketing-manager", label: "Marketing Manager" },
    { value: "demand-generation", label: "Demand Generation" },
  ],
  // Add more industries as needed
  other: [
    { value: "general", label: "General Professional" },
    { value: "manager", label: "Manager" },
    { value: "specialist", label: "Specialist" },
    { value: "coordinator", label: "Coordinator" },
  ],
};

export const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level (0-1 years)" },
  { value: "junior", label: "Junior (1-3 years)" },
  { value: "mid", label: "Mid Level (3-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead/Principal (8+ years)" },
  { value: "executive", label: "Executive/C-Level" },
];

export const USER_GOALS = [
  { value: "improve-ats", label: "Improve ATS compatibility" },
  { value: "cover-letters", label: "Generate better cover letters" },
  { value: "interview-prep", label: "Prepare for interviews" },
  { value: "keyword-optimization", label: "Optimize keywords" },
  { value: "job-matching", label: "Find better job matches" },
  { value: "career-growth", label: "Plan career growth" },
];

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Match score thresholds
export const MATCH_SCORE_THRESHOLDS = {
  NOT_FIT: 70,
  POSSIBLE_FIT: 85,
  GREAT_FIT: 100,
};

// ATS score thresholds
export const ATS_SCORE_THRESHOLDS = {
  POOR: 60,
  GOOD: 80,
  EXCELLENT: 90,
};

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
};

// Local storage keys
export const STORAGE_KEYS = {
  USER: 'hiremate_user',
  THEME: 'hiremate_theme',
  ONBOARDING_PROGRESS: 'hiremate_onboarding',
  RECENT_ANALYSES: 'hiremate_recent_analyses',
};

// API endpoints (for future backend integration)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USER: {
    PROFILE: '/user/profile',
    AVATAR: '/user/avatar',
  },
  RESUME: {
    UPLOAD: '/resume/upload',
    ANALYZE: '/resume/analyze',
    HISTORY: '/resume/history',
  },
  JOB: {
    PARSE: '/job/parse',
    MATCH: '/job/match',
    SUGGESTIONS: '/job/suggestions',
  },
  COVER_LETTER: {
    GENERATE: '/cover-letter/generate',
    SAVE: '/cover-letter/save',
  },
};

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  FILE_TOO_LARGE: 'File size too large. Maximum 10MB allowed.',
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF and DOCX files are allowed.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  ANALYSIS_FAILED: 'Analysis failed. Please try again.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  REGISTER: 'Account created successfully!',
  PASSWORD_RESET: 'Password reset link sent to your email.',
  PROFILE_UPDATED: 'Profile updated successfully!',
  RESUME_UPLOADED: 'Resume uploaded successfully!',
  ANALYSIS_COMPLETE: 'Analysis completed!',
  COVER_LETTER_GENERATED: 'Cover letter generated successfully!',
  COVER_LETTER_SAVED: 'Cover letter saved!',
  COVER_LETTER_COPIED: 'Cover letter copied to clipboard!',
  ONBOARDING_COMPLETE: 'Welcome aboard! Let\'s get you matched!',
};