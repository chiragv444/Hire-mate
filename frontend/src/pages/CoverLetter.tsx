import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  RefreshCw, 
  Save, 
  FileText,
  Sparkles,
  Check
} from 'lucide-react';

import { 
  generateCoverLetter, 
  regenerateCoverLetter, 
  getCoverLetter,
  CoverLetterData 
} from '@/lib/api-new';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/shared/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const CoverLetter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null);
  const [jobDescription, setJobDescription] = useState<any>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (id) {
      loadCoverLetterData();
    }
  }, [id]);

  const loadCoverLetterData = async () => {
    try {
      setIsLoading(true);
      const result = await getCoverLetter(id!);
      
      if (result.success && result.cover_letter) {
        setCoverLetter(result.cover_letter);
        setJobDescription(result.job_description);
        setResumeData(result.resume);
      } else {
        // If no cover letter exists, generate one
        await generateInitialCoverLetter();
      }
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Could not load cover letter data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialCoverLetter = async () => {
    try {
      setIsGenerating(true);
      const result = await generateCoverLetter(id!);
      
      if (result.success && result.cover_letter) {
        setCoverLetter(result.cover_letter);
        // Reload full data to get job description and resume
        await loadCoverLetterData();
      } else {
        toast({
          title: "Generation failed",
          description: result.error || "Could not generate cover letter. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Could not generate cover letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateCoverLetter(id!);
      
      if (result.success && result.cover_letter) {
        setCoverLetter(result.cover_letter);
        setIsEdited(false);
        toast({
          title: "Cover letter regenerated",
          description: "A new version has been generated for you.",
        });
      } else {
        toast({
          title: "Regeneration failed",
          description: result.error || "Could not regenerate cover letter. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: "Could not regenerate cover letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Mock save operation - in real app, this would save to the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsEdited(false);
      toast({
        title: "Cover letter saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save cover letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (coverLetter?.full_content) {
      try {
        await navigator.clipboard.writeText(coverLetter.full_content);
        toast({
          title: "Copied to clipboard",
          description: "Cover letter has been copied to your clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownload = () => {
    if (coverLetter?.full_content) {
      // Create a formatted cover letter for download
      const formattedContent = formatCoverLetterForDownload();
      
      const blob = new Blob([formattedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const jobTitle = jobDescription?.title || 'Position';
      const companyName = jobDescription?.company || 'Company';
      a.download = `Cover_Letter_${jobTitle.replace(/\s+/g, '_')}_${companyName.replace(/\s+/g, '_')}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: "Your cover letter is being downloaded.",
      });
    }
  };

  const formatCoverLetterForDownload = () => {
    if (!coverLetter || !jobDescription) return '';
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let content = '';
    
    // Add header with date
    content += `${currentDate}\n\n`;
    
    // Add company and address (if available)
    if (jobDescription.company) {
      content += `${jobDescription.company}\n`;
    }
    if (jobDescription.location) {
      content += `${jobDescription.location}\n`;
    }
    content += '\n';
    
    // Add salutation
    content += 'Dear Hiring Manager,\n\n';
    
    // Add cover letter content
    content += coverLetter.full_content;
    
    // Add signature
    content += '\n\nSincerely,\n';
    if (resumeData?.parsed_data?.personal_info?.name) {
      content += resumeData.parsed_data.personal_info.name;
    } else {
      content += '[Your Name]';
    }
    
    return content;
  };

  const handleContentChange = (newContent: string) => {
    if (coverLetter) {
      setCoverLetter({ ...coverLetter, full_content: newContent });
      setIsEdited(true);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h3 className="text-lg font-semibold">
            {isGenerating ? 'Generating your cover letter...' : 'Loading cover letter...'}
          </h3>
          <p className="text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!coverLetter || !jobDescription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Cover letter not found</h3>
          <p className="text-muted-foreground">Unable to load cover letter data</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to={`/match-results/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Match Results
              </Button>
            </Link>
            <Logo size="md" />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              disabled={!coverLetter}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!coverLetter}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Cover Letter</h1>
                <p className="text-muted-foreground">
                  AI-generated cover letter for {jobDescription.title} at {jobDescription.company}
                </p>
              </div>
              
              <div className="flex items-center space-x-2 text-success">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">AI Generated</span>
              </div>
            </div>
            
            {coverLetter && (
              <p className="text-sm text-muted-foreground">
                Generated on {new Date(coverLetter.generated_at).toLocaleDateString()} at{' '}
                {new Date(coverLetter.generated_at).toLocaleTimeString()}
              </p>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cover Letter Editor */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Cover Letter Content
                      </CardTitle>
                      <CardDescription>
                        Edit the content to personalize your cover letter
                      </CardDescription>
                    </div>
                    
                    {isEdited && (
                      <div className="flex items-center space-x-2 text-warning">
                        <div className="w-2 h-2 bg-warning rounded-full" />
                        <span className="text-sm">Unsaved changes</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Textarea
                    value={coverLetter.full_content || ''}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="min-h-[600px] resize-none font-mono text-sm leading-relaxed"
                    placeholder="Your cover letter will appear here..."
                  />
                  
                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>
                      {coverLetter.word_count || coverLetter.full_content?.length || 0} characters
                    </span>
                    <span>
                      ~{coverLetter.paragraph_count || Math.ceil((coverLetter.full_content?.length || 0) / 250)} paragraphs
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                  <CardDescription>
                    Manage your cover letter
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleRegenerate}
                    variant="outline"
                    className="w-full"
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSave}
                    variant={isEdited ? "default" : "outline"}
                    className="w-full"
                    disabled={isSaving || !isEdited}
                  >
                    {isSaving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : isEdited ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Saved
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </Button>

                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Job Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job Details</CardTitle>
                  <CardDescription>
                    Position you're applying for
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{jobDescription.title}</h4>
                    <p className="text-sm text-muted-foreground">{jobDescription.company}</p>
                    <p className="text-sm text-muted-foreground">{jobDescription.location}</p>
                  </div>
                  
                  {jobDescription.parsed_skills && jobDescription.parsed_skills.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Key Skills</h5>
                      <div className="flex flex-wrap gap-1">
                        {jobDescription.parsed_skills.slice(0, 6).map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-muted text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {jobDescription.experience_level && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Experience Level</h5>
                      <p className="text-sm text-muted-foreground">{jobDescription.experience_level}</p>
                    </div>
                  )}
                  
                  {jobDescription.years_of_experience && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Years Required</h5>
                      <p className="text-sm text-muted-foreground">{jobDescription.years_of_experience}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💡 Tips</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li>• Customize the opening paragraph</li>
                    <li>• Add specific examples from your experience</li>
                    <li>• Mention the company name and role</li>
                    <li>• Keep it concise (1 page max)</li>
                    <li>• End with a strong call to action</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetter;