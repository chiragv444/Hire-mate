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
const ANALYSIS_COLLECTION = 'analysis_sessions';

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
  defaultResumeId?: string;
  onboardingComplete: boolean;
  onboardingProgress?: Record<string, any>;
}

export interface AnalysisDocument {
  id: string;
  userId: string;
  type: 'resume_analysis' | 'job_analysis' | 'match_result';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'resume_uploaded' | 'job_analyzed';
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

  // Fields for job analysis
  job_data?: any;

  // Fields for match results
  match_results?: any;

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
    await updateDoc(userRef, { defaultResumeId: resumeId });

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

/**
 * Subscribe to a user's analysis sessions for real-time updates.
 */
export function subscribeToUserAnalyses(
  userId: string,
  callback: (analyses: AnalysisDocument[]) => void
): () => void {
  // Simplified query to avoid composite index requirement
  const q = query(
    collection(db, ANALYSIS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    let analyses = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as AnalysisDocument)
    );
    
    // Sort in memory to avoid index requirement
    analyses.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    callback(analyses);
  });
}

/**
 * Get analysis statistics for a user.
 */
export async function getAnalysisStats(userId: string): Promise<AnalysisStats> {
  try {
    const analyses = await getUserAnalyses(userId);
    const completedAnalyses = analyses.filter(
      (a) => a.status === 'completed' && a.match_results
    );

    return {
      total: analyses.length,
      completed: completedAnalyses.length,
      averageScore:
        completedAnalyses.length > 0
          ? completedAnalyses.reduce(
              (sum, a) => sum + (a.match_results?.score || 0),
              0
            ) / completedAnalyses.length
          : null,
    };
  } catch (error) {
    console.error('Error getting analysis stats:', error);
    throw error;
  }
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