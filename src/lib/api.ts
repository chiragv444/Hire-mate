// Mock API functions for Hire Mate SaaS

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
  fitLevel: 'Not Fit' | 'Possible Fit' | 'Great Fit';
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
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (email === "demo@hiremate.me" && password === "password") {
    return {
      success: true,
      user: {
        id: "1",
        email: "demo@hiremate.me",
        fullName: "Demo User",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
        createdAt: new Date().toISOString()
      }
    };
  }
  
  return { success: false, error: "Invalid credentials" };
}

export async function registerUser(email: string, password: string, fullName: string): Promise<{ success: boolean; user?: User; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    user: {
      id: Math.random().toString(36).substr(2, 9),
      email,
      fullName,
      createdAt: new Date().toISOString()
    }
  };
}

export async function resetPassword(email: string): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    message: "Password reset link sent to your email"
  };
}

// Onboarding API
export async function saveOnboardingData(data: OnboardingData): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true };
}

// Resume APIs
export async function uploadResume(file: File): Promise<{ success: boolean; parsedText?: string; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "File size too large. Max 10MB allowed." };
  }
  
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Only PDF and DOCX files are allowed." };
  }
  
  return {
    success: true,
    parsedText: `**${file.name.replace(/\.[^/.]+$/, "")}**\n\nSoftware Engineer with 5+ years of experience in React, TypeScript, and Node.js. Proven track record of building scalable web applications and leading cross-functional teams. Expert in modern frontend frameworks, cloud deployment, and agile methodologies.\n\n**Key Skills:** React, TypeScript, Node.js, AWS, Docker, GraphQL, PostgreSQL, Jest, CI/CD\n\n**Experience:**\n- Senior Software Engineer at TechCorp (2021-Present)\n- Full Stack Developer at StartupXYZ (2019-2021)\n- Junior Developer at WebAgency (2018-2019)\n\n**Education:**\n- B.S. Computer Science, University of Technology (2018)`
  };
}

// Job Description APIs
export async function parseJobDescription(text: string, linkedinUrl?: string): Promise<JobDescription> {
  await new Promise(resolve => setTimeout(resolve, 1800));
  
  const mockJobs = [
    {
      title: "Senior Frontend Developer",
      company: "TechCorp Inc.",
      location: "San Francisco, CA (Remote)",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
      keywords: ["frontend", "react", "typescript", "responsive design", "web performance", "user experience"]
    },
    {
      title: "Full Stack Engineer",
      company: "InnovateLabs",
      location: "New York, NY (Hybrid)",
      skills: ["React", "Node.js", "PostgreSQL", "AWS", "Docker"],
      keywords: ["full-stack", "javascript", "database design", "cloud deployment", "scalability"]
    },
    {
      title: "React Developer",
      company: "StartupXYZ",
      location: "Austin, TX (Remote)",
      skills: ["React", "Redux", "Jest", "Webpack", "CSS-in-JS"],
      keywords: ["react", "state management", "testing", "build tools", "component library"]
    }
  ];
  
  return mockJobs[Math.floor(Math.random() * mockJobs.length)];
}

// Analysis APIs
export async function getMatchScore(resumeText: string, jobDescription: JobDescription): Promise<ResumeAnalysis> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const scores = [65, 72, 78, 84, 91];
  const matchScore = scores[Math.floor(Math.random() * scores.length)];
  const atsScore = Math.min(matchScore + Math.floor(Math.random() * 15), 95);
  
  let fitLevel: 'Not Fit' | 'Possible Fit' | 'Great Fit';
  if (matchScore < 70) fitLevel = 'Not Fit';
  else if (matchScore < 85) fitLevel = 'Possible Fit';
  else fitLevel = 'Great Fit';
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    resumeName: "My Resume.pdf",
    jobTitle: jobDescription.title,
    matchScore,
    atsScore,
    fitLevel,
    missingKeywords: ["Docker", "Kubernetes", "CI/CD", "Microservices", "AWS Lambda"],
    suggestions: [
      "Add more specific technical skills mentioned in the job description",
      "Include quantifiable achievements with metrics and numbers",
      "Optimize keyword density for ATS scanning",
      "Add relevant certifications or training programs",
      "Improve formatting for better ATS readability"
    ],
    createdAt: new Date().toISOString()
  };
}

// Cover Letter APIs
export async function generateCoverLetter(jobDescription: JobDescription, resumeText: string): Promise<CoverLetter> {
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    content: `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobDescription.title} position at ${jobDescription.company}. With my extensive background in frontend development and proven track record of delivering high-quality web applications, I am confident that I would be a valuable addition to your team.

In my current role as a Senior Software Engineer, I have successfully:

• Led the development of responsive web applications using React and TypeScript, serving over 100,000 daily active users
• Implemented modern state management solutions and optimized application performance, resulting in 40% faster load times  
• Collaborated with cross-functional teams to deliver projects on time and within budget
• Mentored junior developers and established best practices for code quality and testing

Your job posting particularly caught my attention because of the emphasis on ${jobDescription.skills.slice(0, 2).join(' and ')}. These technologies align perfectly with my expertise, and I have used them extensively in recent projects to build scalable, maintainable applications.

I am excited about the opportunity to bring my technical skills and passion for creating exceptional user experiences to ${jobDescription.company}. I would welcome the chance to discuss how my background and enthusiasm can contribute to your team's continued success.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
Demo User`,
    generatedAt: new Date().toISOString()
  };
}

// Job Suggestions API
export async function getJobSuggestions(): Promise<Array<{ title: string; company: string; score: number; location: string }>> {
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  return [
    { title: "Senior React Developer", company: "TechFlow", score: 94, location: "Remote" },
    { title: "Frontend Architect", company: "DataSys Inc.", score: 91, location: "San Francisco" },
    { title: "Lead UI Engineer", company: "CloudTech", score: 89, location: "Seattle" },
    { title: "Full Stack Developer", company: "InnovateLabs", score: 87, location: "New York" },
    { title: "React/TypeScript Developer", company: "WebCorp", score: 85, location: "Austin" }
  ];
}

// Workspace APIs
export async function getAnalysisHistory(): Promise<ResumeAnalysis[]> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
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
      createdAt: "2024-01-15T10:30:00Z"
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
      createdAt: "2024-01-14T14:22:00Z"
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
      createdAt: "2024-01-12T09:15:00Z"
    },
    {
      id: "4",
      resumeName: "My_Resume_Final.pdf",
      jobTitle: "Frontend Architect", 
      matchScore: 68,
      atsScore: 74,
      fitLevel: "Not Fit",
      missingKeywords: ["Leadership", "System Design", "Architecture"],
      suggestions: ["Add leadership experience", "Include system design projects"],
      createdAt: "2024-01-10T16:45:00Z"
    }
  ];
  
  return mockAnalyses;
}

// Profile APIs
export async function updateProfile(data: { fullName: string; avatar?: string }): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; avatarUrl?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    success: true,
    avatarUrl: URL.createObjectURL(file)
  };
}