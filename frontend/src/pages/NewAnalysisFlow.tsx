import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, ArrowRight, Loader2, CheckCircle, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

type AnalysisStep = 'job-input' | 'resume-selection' | 'processing';

const NewAnalysisFlow = () => {
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
      const result = await getDefaultResume();
      if (result.success && result.resume) {
        setDefaultResume(result.resume);
        setSelectedResumeId(result.resume.id);
      }
    } catch (error) {
      console.error('Error loading default resume:', error);
    }
  };

  const handleJobSubmit = async () => {
    if (!jobDescription.trim()) {
      toast({ title: 'Error', description: 'Please enter a job description.', variant: 'destructive' });
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

  const handleResumeSubmit = async () => {
    if (!analyticsId) return;

    setIsSubmitting(true);
    setStep('processing');

    try {
      let resumeId: string;

      if (resumeSelectionMode === 'upload' && selectedFile) {
        // Upload new resume
        const uploadResult = await uploadResumeForAnalytics(selectedFile, analyticsId);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload resume');
        }
        resumeId = uploadResult.resume_id!;
      } else if (resumeSelectionMode === 'select' && selectedResumeId) {
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
      initial={{ opacity: 0, x: -50 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 50 }} 
      className="max-w-6xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Job Description Analysis</h1>
        <p className="text-muted-foreground">
          Paste the job description you're interested in to get a detailed match analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Job Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Job Details
            </CardTitle>
            <CardDescription>
              Enter the job description and optional LinkedIn job URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Job Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Paste the complete job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={12}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {jobDescription.length} characters
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                LinkedIn Job URL (Optional)
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://linkedin.com/jobs/view/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setJobDescription(`We are seeking a talented Software Engineer to join our dynamic team. The ideal candidate will have experience in full-stack development with a focus on modern web technologies.

Key Responsibilities:
• Develop and maintain web applications using React, Node.js, and TypeScript
• Collaborate with cross-functional teams to deliver high-quality software solutions
• Write clean, maintainable, and well-documented code
• Participate in code reviews and contribute to technical discussions
• Optimize applications for maximum speed and scalability

Required Qualifications:
• Bachelor's degree in Computer Science or related field
• 3+ years of experience in software development
• Proficiency in JavaScript, React, Node.js, and TypeScript
• Experience with databases (PostgreSQL, MongoDB)
• Knowledge of version control systems (Git)
• Strong problem-solving and communication skills

Preferred Qualifications:
• Experience with cloud platforms (AWS, Azure)
• Knowledge of containerization (Docker, Kubernetes)
• Familiarity with CI/CD pipelines
• Experience with testing frameworks (Jest, Cypress)

We offer competitive salary, comprehensive benefits, and opportunities for professional growth in a collaborative environment.`);
                }}
              >
                Use Sample
              </Button>
              <Button 
                onClick={handleJobSubmit} 
                disabled={!jobDescription.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Parse Job Description
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Parsed Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Parsed Results
            </CardTitle>
            <CardDescription>
              AI-extracted information from the job description
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsedJob ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Job Title</h4>
                  <p className="font-medium">{parsedJob.title || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Company</h4>
                  <p>{parsedJob.company || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Location</h4>
                  <p>{parsedJob.location || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Key Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {parsedJob.parsed_skills.slice(0, 8).map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {skill}
                      </span>
                    ))}
                    {parsedJob.parsed_skills.length > 8 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                        +{parsedJob.parsed_skills.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No job parsed yet</h3>
                <p className="text-sm text-muted-foreground">
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
              Upload Different Resume
            </Button>
            <Button 
              size="lg" 
              onClick={handleResumeSubmit}
              disabled={!selectedFile && !selectedResumeId}
            >
              Continue to Job Input
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderProcessingStep = () => (
    <motion.div 
      key="processing" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="text-center"
    >
      <Card className="max-w-md mx-auto p-8">
        <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary mb-6" />
        <h2 className="text-2xl font-bold">Analysis in Progress</h2>
        <p className="text-muted-foreground mt-2">
          We're analyzing your resume against the job description. You'll be redirected to the results page shortly.
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

export default NewAnalysisFlow;
