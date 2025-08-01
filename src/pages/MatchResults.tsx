import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  Share, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb,
  Star,
  FileText,
  Target,
  Zap
} from 'lucide-react';

import { getMatchScore } from '@/lib/api';
import { ResumeAnalysis, JobDescription } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/shared/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const MatchResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const jobDescription = location.state?.jobDescription as JobDescription;
  const resumeText = location.state?.resumeText as string;

  useEffect(() => {
    if (id === 'new' && jobDescription && resumeText) {
      performAnalysis();
    } else {
      // Load existing analysis by ID
      loadExistingAnalysis(id!);
    }
  }, [id, jobDescription, resumeText]);

  const performAnalysis = async () => {
    try {
      const result = await getMatchScore(resumeText, jobDescription);
      setAnalysis(result);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Could not analyze your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingAnalysis = async (analysisId: string) => {
    // Mock loading existing analysis
    setIsLoading(false);
    // In real implementation, fetch from API
  };

  const getFitLevelColor = (fitLevel: string) => {
    switch (fitLevel) {
      case 'Great Fit': return 'text-success';
      case 'Possible Fit': return 'text-warning';
      case 'Not Fit': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  const getFitLevelIcon = (fitLevel: string) => {
    switch (fitLevel) {
      case 'Great Fit': return <CheckCircle className="h-5 w-5" />;
      case 'Possible Fit': return <AlertCircle className="h-5 w-5" />;
      case 'Not Fit': return <AlertCircle className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h3 className="text-lg font-semibold">Analyzing your resume...</h3>
          <p className="text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Analysis not found</h3>
          <Link to="/workspace">
            <Button>Back to Workspace</Button>
          </Link>
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
            <Link to="/workspace">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workspace
              </Button>
            </Link>
            <Logo size="md" />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{analysis.jobTitle}</h1>
              <p className="text-muted-foreground">
                Analysis for {analysis.resumeName} • {new Date(analysis.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className={`flex items-center space-x-2 ${getFitLevelColor(analysis.fitLevel)}`}>
              {getFitLevelIcon(analysis.fitLevel)}
              <span className="text-lg font-semibold">{analysis.fitLevel}</span>
            </div>
          </div>
        </motion.div>

        {/* Score Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Match Score
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(analysis.matchScore)}`}>
                {analysis.matchScore}%
              </div>
              <Progress value={analysis.matchScore} className="h-3 mb-2" />
              <p className="text-sm text-muted-foreground">
                Overall compatibility with job requirements
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/10 to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  ATS Score
                </CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(analysis.atsScore)}`}>
                {analysis.atsScore}%
              </div>
              <Progress value={analysis.atsScore} className="h-3 mb-2" />
              <p className="text-sm text-muted-foreground">
                Applicant Tracking System compatibility
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="missing" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="missing">Missing Keywords</TabsTrigger>
              <TabsTrigger value="feedback">ATS Feedback</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="missing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-warning" />
                    Missing Keywords
                  </CardTitle>
                  <CardDescription>
                    Important keywords from the job description that are missing from your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingKeywords.map((keyword, index) => (
                      <Badge key={index} variant="destructive">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  
                  {analysis.fitLevel !== 'Great Fit' && (
                    <div className="mt-6 p-4 bg-brand-accent/10 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Star className="h-4 w-4 mr-2 text-brand-accent" />
                        Quick Actions
                      </h4>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="mr-2">
                          Find Better Job Matches
                        </Button>
                        <Button variant="outline" size="sm" className="mr-2">
                          Enhance Resume
                        </Button>
                        <Link to={`/cover-letter/${analysis.id}`}>
                          <Button size="sm">
                            Generate Cover Letter
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-info" />
                    ATS Optimization Feedback
                  </CardTitle>
                  <CardDescription>
                    How well your resume performs with Applicant Tracking Systems
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-success flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Strengths
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li>• Clear section headers and structure</li>
                        <li>• Relevant technical skills listed</li>
                        <li>• Professional contact information</li>
                        <li>• Consistent formatting throughout</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-warning flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li>• Add more industry-specific keywords</li>
                        <li>• Include quantifiable achievements</li>
                        <li>• Optimize keyword density</li>
                        <li>• Add relevant certifications</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-warning" />
                    Improvement Suggestions
                  </CardTitle>
                  <CardDescription>
                    Actionable recommendations to improve your match score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                        <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm flex-1">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          <Link to={`/cover-letter/${analysis.id}`} className="flex-1">
            <Button className="w-full" size="lg">
              <FileText className="h-5 w-5 mr-2" />
              Generate Cover Letter
            </Button>
          </Link>
          <Link to="/upload-resume" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Target className="h-5 w-5 mr-2" />
              Analyze Another Job
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default MatchResults;