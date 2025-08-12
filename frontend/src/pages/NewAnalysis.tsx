import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  X, 
  ArrowRight, 
  Loader2, 
  CheckCircle, 
  Link as LinkIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Logo } from '@/components/shared/Logo';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  createAnalytics, 
  uploadResumeForAnalytics, 
  addExistingResumeToAnalytics, 
  linkDefaultResumeToAnalytics,
  performAnalysis,
  getUserResumes,
  JobDescriptionData 
} from '@/lib/api-new';
import { uploadOnboardingResume } from '@/lib/api';
import { getAnalysis, AnalysisDocument, getResumeById } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type AnalysisStep = 'job-input' | 'resume-selection' | 'processing';

const NewAnalysis = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userDocument } = useAuth();
  const [step, setStep] = useState<AnalysisStep>('job-input');
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);

  // Job input state
  const [jobDescription, setJobDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedJob, setParsedJob] = useState<JobDescriptionData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisDocument | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Resume selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [defaultResume, setDefaultResume] = useState<any>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [resumeSelectionMode, setResumeSelectionMode] = useState<'upload' | 'select'>('select');

  // Load user's resumes and default resume when component mounts
  // Also check for existing analysis ID in query params
  useEffect(() => {
    console.log('Main useEffect running');
    console.log('User:', user);
    console.log('UserDocument:', userDocument);
    console.log('SearchParams:', searchParams.toString());
    
    if (user && userDocument) {
      console.log('User authenticated, loading data...');
      loadUserResumes();
      loadDefaultResume();
      
      // Check if there's an existing analysis ID in query params
      const existingAnalyticsId = searchParams.get('analysis-id');
      if (existingAnalyticsId) {
        console.log('Found existing analytics ID:', existingAnalyticsId);
        setAnalyticsId(existingAnalyticsId);
        loadAnalysisData(existingAnalyticsId);
      } else {
        console.log('No existing analytics ID found');
      }
    } else {
      console.log('User not authenticated yet');
    }
  }, [user, userDocument, searchParams]);

  const loadUserResumes = async () => {
    try {
      const result = await getUserResumes();
      if (result.success && result.resumes) {
        setUserResumes(result.resumes);
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
    }
  };

  const loadDefaultResume = async () => {
    try {
      console.log('Loading default resume for user:', user?.uid);
      console.log('User document:', userDocument);
      
      if (!user || !userDocument) {
        console.log('User not authenticated or user document not loaded');
        return;
      }

      // Check if user has a default resume ID
      if (userDocument.default_resume_id) {
        console.log('Found default_resume_id:', userDocument.default_resume_id);
        try {
          // Fetch the resume document from the 'resumes' collection using the default_resume_id
          const resumeRef = doc(db, 'resumes', userDocument.default_resume_id);
          const resumeSnap = await getDoc(resumeRef);
          
          if (resumeSnap.exists()) {
            const resumeDoc = { id: resumeSnap.id, ...resumeSnap.data() };
            console.log('Resume document fetched from resumes collection:', resumeDoc);
            setDefaultResume(resumeDoc);
            setSelectedResumeId(resumeDoc.id);
            console.log('Default resume set successfully');
            return;
          } else {
            console.log('Resume document not found in resumes collection');
          }
        } catch (error) {
          console.error('Error fetching default resume from resumes collection:', error);
        }
      } else {
        console.log('No default_resume_id found in user document');
      }
      
      // No fallback - only use the default_resume_id from user document
    } catch (error) {
      console.error('Error loading default resume:', error);
    }
  };

  const loadAnalysisData = async (analyticsId: string) => {
    console.log('=== loadAnalysisData called ===');
    console.log('Analytics ID:', analyticsId);
    setIsLoadingAnalysis(true);
    try {
      console.log('Calling getAnalysis with ID:', analyticsId);
      const analysis = await getAnalysis(analyticsId);
      console.log('Analysis data loaded:', analysis);
      console.log('Analysis type:', typeof analysis);
      console.log('Analysis keys:', analysis ? Object.keys(analysis) : 'null');
      
      if (analysis) {
        setAnalysisData(analysis);
        console.log('Analysis data set to state');
        
        // Extract job data for display
        if (analysis.job_description) {
          console.log('Job description found:', analysis.job_description);
          console.log('Job description keys:', Object.keys(analysis.job_description));
          
          // Populate the input fields with existing data
          if (analysis.job_description.description) {
            console.log('Setting job description:', analysis.job_description.description);
            setJobDescription(analysis.job_description.description);
          }
          if (analysis.job_description.linkedin_url) {
            console.log('Setting LinkedIn URL:', analysis.job_description.linkedin_url);
            setLinkedinUrl(analysis.job_description.linkedin_url);
          }
          
          const parsedJobData = {
            title: analysis.job_description.title || '',
            company: analysis.job_description.company || '',
            location: analysis.job_description.location || '',
            description: analysis.job_description.description || '',
            linkedin_url: analysis.job_description.linkedin_url || '',
            parsed_skills: analysis.job_description.parsed_skills || [],
            parsed_requirements: analysis.job_description.parsed_requirements || [],
            parsed_responsibilities: analysis.job_description.parsed_responsibilities || [],
            parsed_qualifications: analysis.job_description.parsed_qualifications || [],
            keywords: analysis.job_description.keywords || []
          };
          console.log('Setting parsed job data:', parsedJobData);
          setParsedJob(parsedJobData);
          console.log('Parsed job data set to state');
        } else {
          console.log('No job_description found in analysis');
          console.log('Available fields:', Object.keys(analysis));
        }
        
        // Set step based on analysis status and step_number
        if (analysis.status === 'in_process' && analysis.step_number === 1) {
          // If analysis is in process and step 1 is complete, go directly to resume selection
          console.log('Analysis in process, step 1 complete, going to resume selection');
          setStep('resume-selection');
        } else if (analysis.step_number === 1) {
          console.log('Step 1, showing job input with parsed data');
          setStep('job-input'); // Keep on job input step to show parsed data
        } else if (analysis.step_number === 2) {
          console.log('Step 2, going to resume selection');
          setStep('resume-selection');
        } else if (analysis.step_number === 3) {
          console.log('Step 3, going to processing');
          setStep('processing');
        }
      } else {
        console.log('No analysis found for ID:', analyticsId);
      }
    } catch (error) {
      console.error('Error loading analysis data:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load analysis data.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoadingAnalysis(false);
      console.log('=== loadAnalysisData completed ===');
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select a file smaller than 10MB.', variant: 'destructive' });
      return;
    }
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please select a PDF or DOCX file.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
    setResumeSelectionMode('upload');
    setSelectedResumeId(null); // Clear any selected resume ID when uploading new file
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  const handleJobSubmit = async () => {
    // If we already have parsed job data, just continue to the next step
    if (parsedJob && analyticsId) {
      setStep('resume-selection');
      return;
    }

    if (!jobDescription.trim() && !linkedinUrl.trim()) {
      toast({ title: 'Error', description: 'Please enter a job description or LinkedIn URL.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAnalytics(jobDescription.trim(), linkedinUrl || undefined);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse job description');
      }

      setAnalyticsId(result.analytics_id!);
      setParsedJob(result.parsed_job!);
      
      // Update URL with analysis ID for persistence
      setSearchParams({ 'analysis-id': result.analytics_id! });
      
      // Load the full analysis data from Firestore
      await loadAnalysisData(result.analytics_id!);
      
      toast({ title: 'Job Description Parsed', description: 'Review the parsed job details below and click Next when ready.' });
    } catch (error) {
      toast({ 
        title: 'Parsing Failed', 
        description: error instanceof Error ? error.message : 'An unknown error occurred.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeSubmit = async () => {
    if (!analyticsId) return;

    setIsSubmitting(true);
    setStep('processing');

    try {
      let resumeId: string;

      // Step 1: Process resume (upload or link)
      if (selectedFile) {
        // Upload new resume
        toast({ title: 'Processing Resume', description: 'Uploading and parsing your resume...' });
        const uploadResult = await uploadResumeForAnalytics(selectedFile, analyticsId);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload resume');
        }
        resumeId = uploadResult.resume_id!;
        toast({ title: 'Resume Processed', description: 'Resume uploaded and parsed successfully!' });
      } else if (selectedResumeId && resumeSelectionMode === 'select') {
        // Use existing resume (including default resume)
        if (selectedResumeId === defaultResume?.id) {
          // Link default resume to analytics
          toast({ title: 'Processing Resume', description: 'Linking your default resume...' });
          const linkResult = await linkDefaultResumeToAnalytics(analyticsId);
          if (!linkResult.success) {
            throw new Error(linkResult.error || 'Failed to link default resume');
          }
          resumeId = selectedResumeId;
          toast({ title: 'Resume Linked', description: 'Default resume linked successfully!' });
        } else {
          // Link other existing resume to analytics
          toast({ title: 'Processing Resume', description: 'Linking your selected resume...' });
          const addResult = await addExistingResumeToAnalytics(analyticsId, selectedResumeId);
          if (!addResult.success) {
            throw new Error(addResult.error || 'Failed to add resume to analysis');
          }
          resumeId = selectedResumeId;
          toast({ title: 'Resume Linked', description: 'Selected resume linked successfully!' });
        }
      } else {
        throw new Error('Please select a resume or upload a new one');
      }

      // Step 2: Perform AI analysis
      toast({ title: 'Analysis in Progress', description: 'AI is analyzing your resume against the job description...' });
      const analysisResult = await performAnalysis(analyticsId);
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Failed to perform analysis');
      }

      toast({ title: 'Analysis Complete', description: 'Redirecting to results...' });
      
      // Redirect to results page
      setTimeout(() => {
        navigate(`/match-results/${analyticsId}`);
      }, 1000);
    } catch (error) {
      toast({ 
        title: 'Analysis Failed', 
        description: error instanceof Error ? error.message : 'An unknown error occurred.', 
        variant: 'destructive' 
      });
      setStep('resume-selection'); // Go back to resume selection
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderJobInputStep = () => {
    console.log('Rendering job input step');
    console.log('parsedJob state:', parsedJob);
    console.log('analyticsId:', analyticsId);
    console.log('analysisData:', analysisData);
    
    return (
      <motion.div
        key="job-input"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Job Description Analysis</h1>
          <p className="text-muted-foreground">
            Paste the job description you're interested in to get a detailed match analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Job Details */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Job Details</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Enter the job description and optional LinkedIn job URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {jobDescription.length} characters
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  LinkedIn Job URL (Optional)
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                onClick={handleJobSubmit}
                disabled={isSubmitting || (!jobDescription.trim() && !linkedinUrl.trim())}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-sm"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing Job Description
                  </>
                ) : parsedJob ? (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue with Existing Data
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Parse Job Description
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Parsed Results */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Parsed Results</CardTitle>
              </div>
              <CardDescription className="text-sm">
                AI-extracted information from the job description
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedJob ? (
                <div className="space-y-6">
                  {/* Job Title with Company and Location */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {parsedJob.title || 'Full Stack Engineer'}
                    </h3>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
                          <span className="text-white text-xs font-bold">B</span>
                        </div>
                        <span>{parsedJob.company || 'InnovateLabs'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <span>{parsedJob.location || 'New York, NY (Hybrid)'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Required Skills */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                      REQUIRED SKILLS
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(parsedJob.parsed_skills || ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker']).slice(0, 5).map((skill: string, index: number) => (
                        <span key={index} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Key Requirements */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                      KEY REQUIREMENTS
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(parsedJob.parsed_requirements || ['full-stack', 'javascript', 'database design', 'cloud deployment', 'scalability']).slice(0, 5).map((req: string, index: number) => (
                        <span key={index} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setStep('resume-selection')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-sm"
                    size="lg"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Analyze Resume Match
                  </Button>
                </div>
              ) : analysisData ? (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Data Loaded</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Raw analysis data is available but job description parsing is incomplete.
                    </p>
                    <div className="text-left bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Debug Info:</h4>
                      <p className="text-sm text-gray-600">Status: {analysisData.status}</p>
                      <p className="text-sm text-gray-600">Step: {analysisData.step_number}</p>
                      <p className="text-sm text-gray-600">Has job_description: {analysisData.job_description ? 'Yes' : 'No'}</p>
                      {analysisData.job_description && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Job Description Keys: {Object.keys(analysisData.job_description).join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No job parsed yet</h3>
                  <p className="text-sm text-gray-500">
                    Enter a job description and click "Parse" to see the extracted information.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  };

  const renderResumeSelectionStep = () => {
    console.log('Rendering resume selection step');
    console.log('defaultResume:', defaultResume);
    console.log('selectedResumeId:', selectedResumeId);
    console.log('resumeSelectionMode:', resumeSelectionMode);
    
    return (
      <motion.div 
        key="resume-selection" 
        initial={{ opacity: 0, x: -50 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: 50 }} 
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Your Resume</h1>
          <p className="text-muted-foreground">
            Upload your resume to get started with AI-powered job matching and optimization.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resume Upload</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX • Maximum size: 10MB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Resume Option */}
            {defaultResume && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="default-resume"
                        name="resume-option"
                        checked={resumeSelectionMode === 'select' && selectedResumeId === defaultResume.id}
                        onChange={() => {
                          setResumeSelectionMode('select');
                          setSelectedResumeId(defaultResume.id);
                          setSelectedFile(null);
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor="default-resume" className="cursor-pointer">
                        <FileText className="h-5 w-5 text-primary" />
                      </label>
                    </div>
                    <div>
                      <p className="font-medium">{defaultResume.filename || defaultResume.original_name || 'Default Resume'}</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{defaultResume.file_type || 'PDF'}</p>
                        <p>{((defaultResume.file_size || 0) / 1024).toFixed(2)} KB</p>
                        <p>{defaultResume.created_at ? new Date(defaultResume.created_at.toMillis()).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        }) : 'Unknown date'}</p>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    Default
                  </span>
                </div>
              </div>
            )}

            {/* File Upload Area */}
            <div
              className={`p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                isDragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={() => setIsDragOver(true)}
              onDragLeave={() => setIsDragOver(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('resume-upload')?.click()}
            >
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : 'Drag and drop your resume here'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {selectedFile ? 'File selected' : 'or click to browse your files'}
                </p>
                <Button variant="outline">
                  Browse Files
                </Button>
                <input
                  id="resume-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".pdf,.docx"
                />
              </div>
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedFile(null);
                      if (defaultResume) {
                        setResumeSelectionMode('select');
                        setSelectedResumeId(defaultResume.id);
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3">
                  <CheckCircle className="h-4 w-4 text-green-500 inline mr-2" />
                  <span className="text-sm text-green-600">Resume parsed successfully!</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('job-input')}>
                Back to Job Input
              </Button>
              <Button 
                size="lg" 
                onClick={handleResumeSubmit}
                disabled={!selectedFile && !(selectedResumeId && resumeSelectionMode === 'select')}
              >
                Continue to Analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderProcessingStep = () => (
    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
      <Card className="max-w-md mx-auto p-8">
        <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-bold mb-4">Analysis in Progress</h2>
        
        <div className="space-y-4 text-left">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-600">Resume processed and linked</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">AI analyzing resume against job description</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin"></div>
            <span className="text-sm text-gray-600">Calculating match scores and insights</span>
          </div>
        </div>
        
        <p className="text-muted-foreground mt-6 text-sm">
          This process typically takes 10-30 seconds. You'll be redirected to the results page shortly.
        </p>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="text-sm text-muted-foreground">
            Step {step === 'job-input' ? 1 : step === 'resume-selection' ? 2 : 3} of 3
          </div>
        </div>
      </header>
      <div className="container mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'job-input' && renderJobInputStep()}
          {step === 'resume-selection' && renderResumeSelectionStep()}
          {step === 'processing' && renderProcessingStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NewAnalysis;

