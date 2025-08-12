import { db } from './firebase';
import { storage } from './firebase';
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
  onSnapshot,
  writeBatch,
  Query,
} from 'firebase/firestore';

// ========================================
// Collection Names
// ========================================
const USERS_COLLECTION = 'users';
const ANALYSIS_COLLECTION = 'analytics';

// ========================================
// Type Definitions
// ========================================
export interface UserDocument {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
  default_resume_id?: string;
  onboardingComplete: boolean;
  onboardingProgress?: Record<string, any>;
}

export interface AnalysisDocument {
  id: string;
  userId: string;
  type: 'resume_analysis' | 'job_analysis' | 'match_result';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'resume_uploaded' | 'job_analyzed' | 'in_process';
  step_number?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;

  // Fields for resume analysis
  name?: string; // resume name
  fileUrl?: string;
  filePath?: string;
  isDefault?: boolean;
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
  };
  parsed_data?: any;

  // Enhanced job analysis fields
  job_description?: {
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
    raw_data?: any;
    detailed_summary?: string;
    parsed_data?: any;
    experience_level?: string;
    years_of_experience?: string;
    job_type?: string;
    salary_info?: any;
    benefits?: string[];
    company_info?: any;
  };
  
  // Legacy fields for backward compatibility
  job_data?: any;
  job_raw_data?: any;
  job_detailed_summary?: string;
  job_parsed_data?: any;

  // Resume data
  resume?: {
    resume_id?: string;
    filename?: string;
    original_name?: string;
    type: string;
    parsed_data?: any;
  };

  // Analysis results
  results?: {
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
  };

  error?: string;
}

export interface AnalysisStats {
  total: number;
  completed: number;
  averageScore: number | null;
}

// ========================================
// User Functions
// ========================================

/**
 * Create or update a user document.
 * If the user does not exist, it creates a new document with initial fields.
 * If the user exists, it merges the new data.
 */
export async function createOrUpdateUser(
  uid: string,
  userData: Partial<Omit<UserDocument, 'uid' | 'createdAt'>>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    const now = serverTimestamp();
    const dataToSet = {
      ...userData,
      updatedAt: now,
      ...(!userSnap.exists() && {
        uid,
        createdAt: now,
        onboardingComplete: false,
        lastActiveAt: now,
      }),
    };

    await setDoc(userRef, dataToSet, { merge: true });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

/**
 * Get a user document by UID.
 */
export async function getUser(uid: string): Promise<UserDocument | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { uid: userSnap.id, ...userSnap.data() } as UserDocument;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Update a user document.
 */
export async function updateUser(
  uid: string,
  data: Partial<UserDocument>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Set a user's default resume.
 */
export async function setDefaultResume(
  uid: string,
  resumeId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, { default_resume_id: resumeId });

    // Also update the isDefault flag on the resume document itself
    const batch = writeBatch(db);
    const q = query(collection(db, ANALYSIS_COLLECTION), where('userId', '==', uid), where('type', '==', 'resume_analysis'));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(doc => {
      batch.update(doc.ref, { isDefault: doc.id === resumeId });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error setting default resume:', error);
    throw error;
  }
}

/**
 * Update user's last active timestamp.
 */
export async function updateLastActive(uid: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating last active:', error);
    throw error;
  }
}

/**
 * Update user profile information.
 */
export async function updateUserProfile(
  uid: string,
  profileData: Partial<UserDocument>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get user's onboarding progress.
 */
export async function getOnboardingProgress(uid: string): Promise<Record<string, any> | null> {
  try {
    const user = await getUser(uid);
    return user?.onboardingProgress || null;
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    throw error;
  }
}

/**
 * Save onboarding progress for a specific step.
 */
export async function saveOnboardingProgress(
  uid: string,
  step: string,
  stepData: any
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      [`onboardingProgress.${step}`]: stepData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    throw error;
  }
}

/**
 * Complete the onboarding process.
 */
export async function completeOnboarding(
  uid: string,
  onboardingData: any
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      onboardingComplete: true,
      onboardingProgress: onboardingData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}

// ========================================
// Analysis Functions
// ========================================

/**
 * Create a new analysis session.
 */
/**
 * Create a new analysis session document in Firestore.
 * This is the first step in the analysis process.
 */
export async function createAnalysisSession(
  userId: string,
  fileName: string
): Promise<string> {
  try {
    const newAnalysisRef = doc(collection(db, ANALYSIS_COLLECTION));
    await setDoc(newAnalysisRef, {
      userId,
      name: fileName,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newAnalysisRef.id;
  } catch (error) {
    console.error('Error creating analysis session:', error);
    throw new Error('Could not start analysis session.');
  }
}

/**
 * Upload a resume file to Firebase Storage and update the analysis document.
 */
export async function uploadResumeForAnalysis(
  userId: string,
  analysisId: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  const filePath = `users/${userId}/resumes/${analysisId}/${file.name}`;
  const storageRef = ref(storage, filePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(new Error('File upload failed.'));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const analysisRef = doc(db, ANALYSIS_COLLECTION, analysisId);
          await updateDoc(analysisRef, {
            status: 'resume_uploaded',
            fileUrl: downloadURL,
            filePath: filePath,
            'metadata.fileName': file.name,
            'metadata.fileSize': file.size,
            'metadata.fileType': file.type,
            updatedAt: serverTimestamp(),
          });
          resolve();
        } catch (error) {
          console.error('Error updating analysis document:', error);
          reject(new Error('Failed to save resume details.'));
        }
      }
    );
  });
}

/**
 * Update an analysis document with the job description to trigger backend processing.
 */
export async function updateAnalysisWithJobDescription(
  analysisId: string,
  jobDescription: string
): Promise<void> {
  try {
    const analysisRef = doc(db, ANALYSIS_COLLECTION, analysisId);
    await updateDoc(analysisRef, {
      'job_data.raw_text': jobDescription,
      status: 'processing', // Trigger for backend function
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating analysis with job description:', error);
    throw new Error('Could not submit job description.');
  }
}

export async function createAnalysis(
  userId: string,
  analysisData: Omit<
    AnalysisDocument,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status'
  >
): Promise<AnalysisDocument> {
  try {
    const now = serverTimestamp();
    const newAnalysisRef = doc(collection(db, ANALYSIS_COLLECTION));

    const newAnalysis: Omit<AnalysisDocument, 'id'> = {
      ...analysisData,
      userId,
      status: 'pending',
      createdAt: now as Timestamp,
      updatedAt: now as Timestamp,
    };

    await setDoc(newAnalysisRef, newAnalysis);
    return { id: newAnalysisRef.id, ...newAnalysis } as AnalysisDocument;
  } catch (error) {
    console.error('Error creating analysis:', error);
    throw error;
  }
}

/**
 * Get all analysis sessions for a user.
 */
export async function getUserAnalyses(
  userId: string,
  options: { limit?: number } = {}
): Promise<AnalysisDocument[]> {
  try {
    // Simplified query to avoid composite index requirement
    const q = query(
      collection(db, ANALYSIS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    let analyses = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as AnalysisDocument)
    );

    // Sort in memory to avoid index requirement
    analyses.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    // Apply limit if specified
    if (options.limit) {
      analyses = analyses.slice(0, options.limit);
    }

    return analyses;
  } catch (error) {
    console.error('Error getting user analyses:', error);
    throw error;
  }
}

/**
 * Get a single analysis document by its ID.
 */
export async function getAnalysis(analysisId: string): Promise<AnalysisDocument | null> {
  try {
    const analysisRef = doc(db, ANALYSIS_COLLECTION, analysisId);
    const analysisSnap = await getDoc(analysisRef);

    if (analysisSnap.exists()) {
      return { id: analysisSnap.id, ...analysisSnap.data() } as AnalysisDocument;
    }
    return null;
  } catch (error) {
    console.error('Error getting analysis:', error);
    throw error;
  }
}

/**
 * Get analytics data from the analytics collection by ID.
 * This is specifically for fetching the enhanced analysis results.
 */
export async function getAnalyticsData(analyticsId: string): Promise<any | null> {
  try {
    const analyticsRef = doc(db, ANALYSIS_COLLECTION, analyticsId);
    const analyticsSnap = await getDoc(analyticsRef);

    if (analyticsSnap.exists()) {
      return { id: analyticsSnap.id, ...analyticsSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting analytics data:', error);
    throw error;
  }
}

/**
 * Get user's analytics data for workspace display
 * This fetches all analytics documents for a user with enhanced data structure
 */
export async function getUserAnalyticsForWorkspace(userId: string): Promise<any[]> {
  try {
    // Remove orderBy to avoid composite index requirement
    const q = query(
      collection(db, ANALYSIS_COLLECTION),
      where('user_id', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const analytics = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at || data.createdAt || null
      };
    });

    // Sort in memory instead of using orderBy
    analytics.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : 0;
      const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : 0;
      return dateB - dateA; // Latest first
    });

    return analytics;
  } catch (error) {
    console.error('Error getting user analytics for workspace:', error);
    throw error;
  }
}

/**
 * Get enhanced workspace statistics for a user
 * This provides comprehensive stats for the workspace dashboard
 */
export async function getWorkspaceStats(userId: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  averageMatchScore: number;
  averageATSScore: number;
  greatFits: number;
  possibleFits: number;
  notFits: number;
  thisWeek: number;
}> {
  try {
    const analytics = await getUserAnalyticsForWorkspace(userId);
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: analytics.length,
      completed: 0,
      inProgress: 0,
      averageMatchScore: 0,
      averageATSScore: 0,
      greatFits: 0,
      possibleFits: 0,
      notFits: 0,
      thisWeek: 0
    };

    let totalMatchScore = 0;
    let totalATSScore = 0;
    let scoreCount = 0;

    analytics.forEach(analysis => {
      // Count by status
      if (analysis.status === 'completed') {
        stats.completed++;
      } else if (analysis.status === 'in_process' || analysis.status === 'processing') {
        stats.inProgress++;
      }

      // Count by fit level
      const fitLevel = analysis.results?.enhanced_analysis?.fit_level || 
                      analysis.results?.basic_results?.fit_level || 'Not Fit';
      
      if (fitLevel === 'Great Fit') {
        stats.greatFits++;
      } else if (fitLevel === 'Possible Fit') {
        stats.possibleFits++;
      } else {
        stats.notFits++;
      }

      // Calculate scores
      const matchScore = analysis.results?.enhanced_analysis?.match_score || 
                        analysis.results?.basic_results?.match_score || 0;
      const atsScore = analysis.results?.enhanced_analysis?.ats_score || 
                      analysis.results?.basic_results?.ats_score || 0;

      if (matchScore > 0) {
        totalMatchScore += matchScore;
        totalATSScore += atsScore;
        scoreCount++;
      }

      // Count this week's analyses
      if (analysis.created_at) {
        const createdDate = analysis.created_at.toDate ? analysis.created_at.toDate() : new Date(analysis.created_at);
        if (createdDate >= weekAgo) {
          stats.thisWeek++;
        }
      }
    });

    if (scoreCount > 0) {
      stats.averageMatchScore = Math.round(totalMatchScore / scoreCount);
      stats.averageATSScore = Math.round(totalATSScore / scoreCount);
    }

    return stats;
  } catch (error) {
    console.error('Error getting workspace stats:', error);
    throw error;
  }
}

/**
 * Subscribe to user's analytics data for real-time workspace updates
 */
export function subscribeToUserAnalytics(
  userId: string,
  callback: (analytics: any[], stats: any) => void
): () => void {
  // Remove orderBy to avoid composite index requirement
  const q = query(
    collection(db, ANALYSIS_COLLECTION),
    where('user_id', '==', userId)
  );

  return onSnapshot(q, async (querySnapshot) => {
    try {
      const analytics = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at || data.createdAt || null
        };
      });

      // Sort in memory instead of using orderBy
      analytics.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : 0;
        const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : 0;
        return dateB - dateA; // Latest first
      });

      const stats = await getWorkspaceStats(userId);
      callback(analytics, stats);
    } catch (error) {
      console.error('Error in analytics subscription:', error);
      callback([], { total: 0, completed: 0, averageMatchScore: 0 });
    }
  });
}

/**
 * Get a resume document by its ID.
 */
export async function getResumeById(resumeId: string): Promise<AnalysisDocument | null> {
  try {
    const resumeRef = doc(db, ANALYSIS_COLLECTION, resumeId);
    const resumeSnap = await getDoc(resumeRef);

    if (resumeSnap.exists()) {
      return { id: resumeSnap.id, ...resumeSnap.data() } as AnalysisDocument;
    }
    return null;
  } catch (error) {
    console.error('Error getting resume by ID:', error);
    throw error;
  }
}

/**
 * Get all resumes for a specific user.
 */
export async function getUserResumes(userId: string): Promise<AnalysisDocument[]> {
  try {
    // Simplified query to avoid composite index requirement
    const q = query(
      collection(db, ANALYSIS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    let resumes = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as AnalysisDocument))
      .filter((doc) => doc.type === 'resume_analysis');
    
    // Sort in memory to avoid index requirement
    resumes.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return resumes;
  } catch (error) {
    console.error('Error getting user resumes:', error);
    throw error;
  }
}

/**
 * Delete an analysis document.
 */
export async function deleteAnalysis(analysisId: string): Promise<void> {
  try {
    const analysisRef = doc(db, ANALYSIS_COLLECTION, analysisId);
    await deleteDoc(analysisRef);
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  }
}

/**
 * Subscribe to a single analysis document for real-time updates.
 */
export function subscribeToAnalysis(
  analysisId: string,
  callback: (analysis: AnalysisDocument | null) => void
): () => void {
  const analysisRef = doc(db, ANALYSIS_COLLECTION, analysisId);

  return onSnapshot(analysisRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as AnalysisDocument);
    } else {
      callback(null);
    }
  });
}

// ========================================
// Legacy Service Exports (for compatibility)
// ========================================

// UserService - wrapper around user functions
export const UserService = {
  createOrUpdateUser,
  getUser,
  updateUser,
  setDefaultResume,
  updateLastActive,
  updateUserProfile,
};

// OnboardingService - wrapper around onboarding functions
export const OnboardingService = {
  createOrUpdateUser,
  updateUser,
  getOnboardingProgress,
  saveOnboardingProgress,
  completeOnboarding,
};