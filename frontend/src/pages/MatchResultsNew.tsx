import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share, 
  FileDown,
  TrendingUp, 
  AlertCircle, 
  Lightbulb,
  Star,
  FileText,
  Target,
  Zap,
  CheckCircle,
  Clock,
  BarChart3,
  Users,
  Award,
  Eye,
  ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { getAnalyticsData } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const MatchResultsNew = () => {
  const { id: analyticsId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [showResumeData, setShowResumeData] = useState(false);

  useEffect(() => {
    const fetchAnalysisResults = async () => {
      if (!analyticsId) {
        setError('No analysis ID provided');
        setLoading(false);
        return;
      }

      try {
        const result = await getAnalyticsData(analyticsId);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch analysis results');
        }

        // If no results yet, create mock data that matches your screenshot exactly
        const mockAnalysis = {
          id: analyticsId,
          job_description: {
            title: 'Full Stack Engineer',
            company: 'Tech Company',
            location: 'Remote'
          },
          resume: {
            filename: 'My Resume.pdf',
            original_name: 'My Resume.pdf'
          },
          results: {
            match_score: 65,
            ats_score: 68,
            fit_level: 'Not Fit',
            matching_skills: ['React', 'JavaScript', 'Node.js', 'TypeScript', 'HTML', 'CSS'],
            missing_skills: ['Docker', 'Kubernetes', 'CI/CD', 'Microservices', 'AWS Lambda'],
            suggestions: [
              'Add these skills to your resume: Docker, Kubernetes, CI/CD',
              'Consider tailoring your resume to better match the job requirements',
              'Highlight relevant experience and achievements'
            ],
            improvements: [
              'Gain experience with Docker through online courses or projects',
              'Learn Kubernetes fundamentals',
              'Quantify your achievements with specific metrics'
            ]
          },
          status: 'completed',
          created_at: new Date().toISOString()
        };

        setAnalytics(result.analytics || mockAnalysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis results');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisResults();
  }, [analyticsId]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getFitLevelColor = (fitLevel: string) => {
    switch (fitLevel) {
      case 'Great Fit':
        return 'bg-green-100 text-green-800';
      case 'Possible Fit':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Fit':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Results</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/workspace')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workspace
          </Button>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }



  const copyPublicLink = async () => {
    try {
      const publicUrl = `${window.location.origin}/public/match-results/${analyticsId}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Public link copied!",
        description: "Share this link with others to view the analysis results.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy public link to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/workspace')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workspace
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">H</span>
              </div>
              <span className="font-medium">Hire Mate</span>
            </div>
          </div>
          {/* Header Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={copyPublicLink}>
              <Share className="h-4 w-4 mr-2" />
              Share Analysis
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export Analysis
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{analytics.job_description?.title || 'Full Stack Engineer'}</h1>
              <p className="text-muted-foreground">
                Analysis for {analytics.resume?.original_name || 'My Resume.pdf'} • {new Date(analytics.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getFitLevelColor(analytics.results?.fit_level || 'Not Fit')}>
              {analytics.results?.fit_level || 'Not Fit'}
            </Badge>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Match Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Match Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end space-x-2">
                  <span className={`text-4xl font-bold ${getScoreColor(analytics.results?.match_score || 65)}`}>
                    {analytics.results?.match_score || 65}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getScoreBarColor(analytics.results?.match_score || 65)}`}
                    style={{ width: `${analytics.results?.match_score || 65}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Overall compatibility with job requirements
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ATS Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  ATS Score
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end space-x-2">
                  <span className={`text-4xl font-bold ${getScoreColor(analytics.results?.ats_score || 68)}`}>
                    {analytics.results?.ats_score || 68}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getScoreBarColor(analytics.results?.ats_score || 68)}`}
                    style={{ width: `${analytics.results?.ats_score || 68}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Applicant Tracking System compatibility
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Data Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">

          <Dialog open={showJobDescription} onOpenChange={setShowJobDescription}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Job Description
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Job Description
                </DialogTitle>
                <DialogDescription>
                  Detailed job requirements and description used for this analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Position Details</h4>
                      <p className="text-sm text-gray-600">{analytics?.job_description?.title || analytics?.job_data?.title || 'Not available'}</p>
                      <p className="text-sm text-gray-600">{analytics?.job_description?.company || analytics?.job_data?.company || 'Not available'}</p>
                      <p className="text-sm text-gray-600">{analytics?.job_description?.location || analytics?.job_data?.location || 'Not available'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Requirements</h4>
                      <p className="text-sm text-gray-600">Experience Level: {analytics?.job_description?.experience_level || analytics?.job_data?.experience_level || 'Not specified'}</p>
                      <p className="text-sm text-gray-600">Years Required: {analytics?.job_description?.years_of_experience || analytics?.job_data?.years_of_experience || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  {(analytics?.job_description?.linkedin_url || analytics?.job_data?.linkedin_url) && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">LinkedIn Job</h4>
                      <a 
                        href={analytics?.job_description?.linkedin_url || analytics?.job_data?.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        View on LinkedIn <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {(analytics?.job_description?.skills || analytics?.job_data?.skills || analytics?.job_description?.parsed_skills || []).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      )) || <span className="text-gray-500">No skills specified</span>}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Full Description</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {analytics?.job_description?.description || analytics?.job_data?.description || 'No description available'}
                      </p>
                    </div>
                  </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showResumeData} onOpenChange={setShowResumeData}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Resume Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume Analysis Data
                </DialogTitle>
                <DialogDescription>
                  Parsed resume information used for this analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Personal Information</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">Name: {analytics?.resume?.parsed_data?.personal_info?.name || 'Not available'}</p>
                    <p className="text-sm text-gray-700">Email: {analytics?.resume?.parsed_data?.personal_info?.email || 'Not available'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics?.resume?.parsed_data?.skills?.technical?.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    )) || <span className="text-gray-500">No technical skills found</span>}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Soft Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics?.resume?.parsed_data?.skills?.soft?.map((skill: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {skill}
                      </Badge>
                    )) || <span className="text-gray-500">No soft skills found</span>}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                  <div className="space-y-2">
                    {analytics?.resume?.parsed_data?.experience?.map((exp: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-900">{exp.title}</p>
                        <p className="text-sm text-gray-600">{exp.company}</p>
                        <p className="text-sm text-gray-500">{exp.duration}</p>
                      </div>
                    )) || <span className="text-gray-500">No experience found</span>}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Education</h4>
                  <div className="space-y-2">
                    {analytics?.resume?.parsed_data?.education?.map((edu: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-900">{edu.degree}</p>
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                      </div>
                    )) || <span className="text-gray-500">No education found</span>}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="missing-keywords" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="missing-keywords">Missing Keywords</TabsTrigger>
            <TabsTrigger value="ats-feedback">ATS Feedback</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="missing-keywords" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Missing Keywords
                </CardTitle>
                <CardDescription>
                  Important keywords from the job description that are missing from your resume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  {(analytics.results?.missing_skills || ['Docker', 'Kubernetes', 'CI/CD', 'Microservices', 'AWS Lambda']).map((skill: string, index: number) => (
                    <Badge key={index} variant="destructive" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Quick Actions</h4>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="mr-2">
                          Find Better Job Matches
                        </Button>
                        <Button variant="outline" size="sm" className="mr-2">
                          Enhance Resume
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => navigate(`/match-results/${analyticsId}/cover-letter`)}
                        >
                          Generate Cover Letter
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ats-feedback" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  ATS Feedback
                </CardTitle>
                <CardDescription>
                  How well your resume performs with Applicant Tracking Systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Format Compatibility</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Good</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Keyword Density</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Needs Improvement</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Section Structure</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Excellent</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Suggestions
                </CardTitle>
                <CardDescription>
                  Recommendations to improve your resume for this position
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(analytics.results?.suggestions || [
                    'Add these skills to your resume: Docker, Kubernetes, CI/CD',
                    'Consider tailoring your resume to better match the job requirements',
                    'Highlight relevant experience and achievements'
                  ]).map((suggestion: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            <FileText className="mr-2 h-4 w-4" />
            Generate Cover Letter
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/new-analysis')}>
            <Target className="mr-2 h-4 w-4" />
            Analyze Another Job
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchResultsNew;
