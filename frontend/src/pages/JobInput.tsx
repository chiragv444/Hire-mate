import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  FileText, 
  LinkIcon, 
  Search, 
  Briefcase, 
  MapPin, 
  Building,
  ArrowRight,
  Sparkles
} from 'lucide-react';

import { parseJobDescription } from '@/lib/api';
import { jobInputSchema, type JobInputFormData } from '@/lib/validation';
import { JobDescription } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/shared/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const JobInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resumeText = location.state?.resumeText || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [parsedJob, setParsedJob] = useState<JobDescription | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<JobInputFormData>({
    resolver: zodResolver(jobInputSchema),
  });

  const jobDescription = watch('jobDescription');

  const onSubmit = async (data: JobInputFormData) => {
    setIsLoading(true);
    try {
      const jobData = await parseJobDescription(data.jobDescription, data.linkedinUrl);
      setParsedJob(jobData);
      
      toast({
        title: "Job description parsed!",
        description: "Ready to analyze your resume match.",
      });
    } catch (error) {
      toast({
        title: "Parsing failed",
        description: "Please check your job description and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (parsedJob) {
      // Navigate to match results with job data
      navigate('/match-results/new', { 
        state: { 
          jobDescription: parsedJob,
          resumeText 
        } 
      });
    }
  };

  const sampleJobDescription = `Senior Frontend Developer - Remote

We are looking for an experienced Senior Frontend Developer to join our growing team. You will be responsible for building responsive web applications using modern JavaScript frameworks and ensuring excellent user experiences across all devices.

Requirements:
• 5+ years of experience in frontend development
• Expert knowledge of React, TypeScript, and modern JavaScript (ES6+)
• Strong experience with CSS3, HTML5, and responsive design
• Experience with state management libraries (Redux, Zustand)
• Familiarity with build tools (Webpack, Vite) and package managers
• Experience with testing frameworks (Jest, Cypress)
• Knowledge of RESTful APIs and GraphQL
• Experience with version control systems (Git)
• Strong problem-solving skills and attention to detail

Nice to have:
• Experience with Next.js and SSR/SSG
• Knowledge of cloud platforms (AWS, Vercel)
• Experience with Docker and CI/CD
• Familiarity with design systems and component libraries

We offer competitive salary, flexible working hours, comprehensive health benefits, and opportunities for professional growth.`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Logo size="md" />
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-4">Job Description Analysis</h1>
            <p className="text-muted-foreground text-lg">
              Paste the job description you're interested in to get a detailed match analysis.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Job Input Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Job Details
                  </CardTitle>
                  <CardDescription>
                    Enter the job description and optional LinkedIn job URL
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobDescription">
                        Job Description *
                      </Label>
                      <Textarea
                        id="jobDescription"
                        placeholder="Paste the complete job description here..."
                        className="min-h-[300px] resize-none"
                        {...register('jobDescription')}
                      />
                      {errors.jobDescription && (
                        <p className="text-sm text-error">{errors.jobDescription.message}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{jobDescription?.length || 0} characters</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const textarea = document.getElementById('jobDescription') as HTMLTextAreaElement;
                            if (textarea) {
                              textarea.value = sampleJobDescription;
                              textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                          }}
                          className="text-xs"
                        >
                          Use Sample
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedinUrl">
                        LinkedIn Job URL (Optional)
                      </Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="linkedinUrl"
                          type="url"
                          placeholder="https://linkedin.com/jobs/view/..."
                          className="pl-10"
                          {...register('linkedinUrl')}
                        />
                      </div>
                      {errors.linkedinUrl && (
                        <p className="text-sm text-error">{errors.linkedinUrl.message}</p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !jobDescription?.trim()}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Parsing Job Description...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Parse Job Description
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Parsed Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Parsed Results
                  </CardTitle>
                  <CardDescription>
                    AI-extracted information from the job description
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {!parsedJob ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No job parsed yet</h3>
                      <p className="text-muted-foreground">
                        Enter a job description and click "Parse" to see the extracted information.
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Job Info */}
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Briefcase className="h-5 w-5 text-primary mt-1" />
                          <div>
                            <h3 className="font-semibold text-lg">{parsedJob.title}</h3>
                            <div className="flex items-center space-x-4 text-muted-foreground mt-1">
                              <div className="flex items-center space-x-1">
                                <Building className="h-4 w-4" />
                                <span>{parsedJob.company}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4" />
                                <span>{parsedJob.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          Required Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {parsedJob.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          Key Requirements
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {parsedJob.keywords.map((keyword, index) => (
                            <Badge key={index} variant="outline">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={handleAnalyze}
                        className="w-full"
                        size="lg"
                      >
                        Analyze Resume Match
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobInput;