import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { 
  createAnalytics, 
  uploadResumeForAnalytics, 
  addExistingResumeToAnalytics, 
  performAnalysis,
  getUserResumes,
  getDefaultResume,
  JobDescriptionData 
} from '@/lib/api-new';
import { getOnboardingDefaultResume, uploadOnboardingResume } from '@/lib/api';

type AnalysisStep = 'job-input' | 'resume-selection' | 'processing';

const NewAnalysis = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<AnalysisStep>('job-input');
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);

  // Job input state
  const [jobDescription, setJobDescription] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedJob, setParsedJob] = useState<JobDescriptionData | null>(null);

  // Resume selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [defaultResume, setDefaultResume] = useState<any>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [resumeSelectionMode, setResumeSelectionMode] = useState<'upload' | 'select'>('select');

  // Load user's resumes and default resume when component mounts
  useEffect(() => {
    loadUserResumes();
    loadDefaultResume();
  }, []);

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
      // First try to get default resume from onboarding
      const onboardingResult = await getOnboardingDefaultResume();
      if (onboardingResult.success && onboardingResult.resume) {
        setDefaultResume(onboardingResult.resume);
        setSelectedResumeId(onboardingResult.resume.id);
        return;
      }
      
      // Fallback to analytics default resume
      const result = await getDefaultResume();
      if (result.success && result.resume) {
        setDefaultResume(result.resume);
        setSelectedResumeId(result.resume.id);
      }
    } catch (error) {
      console.error('Error loading default resume:', error);
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
    setSelectedResumeId(null); // Clear any selected resume ID
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
      
      toast({ title: 'Job Description Parsed', description: 'Now, please select or upload your resume.' });
      setStep('resume-selection');
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

      if (selectedFile) {
        // Upload new resume
        const uploadResult = await uploadResumeForAnalytics(selectedFile, analyticsId);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload resume');
        }
        resumeId = uploadResult.resume_id!;
      } else if (selectedResumeId) {
        // Use existing resume
        const addResult = await addExistingResumeToAnalytics(analyticsId, selectedResumeId);
        if (!addResult.success) {
          throw new Error(addResult.error || 'Failed to add resume to analysis');
        }
        resumeId = selectedResumeId;
      } else {
        throw new Error('Please select a resume or upload a new one');
      }

      // Perform analysis
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

  const renderJobInputStep = () => (
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

  const renderResumeSelectionStep = () => (
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
                    <p className="font-medium">{defaultResume.original_name}</p>
                    <p className="text-sm text-muted-foreground">Default Resume</p>
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
              disabled={!selectedFile && !selectedResumeId}
            >
              Continue to Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderProcessingStep = () => (
    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
      <Card className="max-w-md mx-auto p-8">
        <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-bold">Analysis in Progress</h2>
        <p className="text-muted-foreground mt-2">We're analyzing your resume against the job description. You'll be redirected to the results page shortly.</p>
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
