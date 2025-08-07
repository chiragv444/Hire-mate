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
  Zap
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const MatchResults = () => {
  const { id: analyticsId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!analyticsId || !user) {
      if (!user) {
        setLoading(true);
        return;
      }
      setError('No analytics ID provided');
      setLoading(false);
      return;
    }

    // Set up real-time listener for analytics document
    const analyticsRef = doc(db, 'analytics', analyticsId);
    
    const unsubscribe = onSnapshot(
      analyticsRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.user_id === user.uid) {
            setAnalytics({ id: doc.id, ...data });
            setLoading(false);
          } else {
            setError('Access denied: This analysis belongs to another user');
            setLoading(false);
          }
        } else {
          setError('Analysis not found');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching analytics:', error);
        setError('Failed to load analysis results');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [analyticsId, user]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">An Error Occurred</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/workspace')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analysis Not Found</h3>
              <p className="text-muted-foreground mb-4">The requested analysis could not be found.</p>
              <Button onClick={() => navigate('/workspace')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const results = analytics.results || {};
  const matchScore = results.match_score || 84;
  const atsScore = results.ats_score || 95;
  const missingKeywords = results.missing_keywords || ['Docker', 'Kubernetes', 'CI/CD', 'Microservices', 'AWS Lambda'];
  const suggestions = results.suggestions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/workspace')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">Hire Mate</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Title Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Senior Frontend Developer</h1>
            <div className="flex items-center text-sm text-gray-500">
              <span>Analysis for My Resume.pdf</span>
              <span className="mx-2">•</span>
              <span>8/6/2025</span>
              <div className="ml-auto flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                <span className="text-orange-600 font-medium">Possible Fit</span>
              </div>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Match Score Card */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <Target className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="font-semibold text-gray-900">Match Score</span>
                  </div>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-orange-600">{matchScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${matchScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">Overall compatibility with job requirements</p>
              </CardContent>
            </Card>

            {/* ATS Score Card */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Zap className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-semibold text-gray-900">ATS Score</span>
                  </div>
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-green-600">{atsScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${atsScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">Applicant Tracking System compatibility</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="missing" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
              <TabsTrigger value="missing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Missing Keywords</TabsTrigger>
              <TabsTrigger value="ats" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">ATS Feedback</TabsTrigger>
              <TabsTrigger value="suggestions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Suggestions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="missing" className="mt-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Missing Keywords</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Important keywords from the job description that are missing from your resume</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {missingKeywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="destructive" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100/80">
                        {keyword}
                      </Badge>
                    ))}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900">Quick Actions</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button variant="outline" size="sm" className="justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Find Better Job Matches
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start">
                        <Star className="h-4 w-4 mr-2" />
                        Enhance Resume
                      </Button>
                      <Button variant="default" size="sm" className="justify-start bg-blue-600 hover:bg-blue-700">
                        <FileDown className="h-4 w-4 mr-2" />
                        Generate Cover Letter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ats" className="mt-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Zap className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">ATS Feedback</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Recommendations to improve your resume's compatibility with Applicant Tracking Systems</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">Good keyword density</p>
                        <p className="text-sm text-gray-600">Your resume contains relevant keywords at an appropriate frequency.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">Standard formatting</p>
                        <p className="text-sm text-gray-600">Your resume uses ATS-friendly formatting and structure.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Suggestions</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Recommendations to improve your match score and overall application strength</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">Add missing technical skills</p>
                        <p className="text-sm text-gray-600">Include Docker, Kubernetes, and CI/CD experience in your skills section.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">Highlight microservices experience</p>
                        <p className="text-sm text-gray-600">Emphasize any experience with microservices architecture in your work history.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom Action Buttons */}
          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
              <FileDown className="mr-2 h-4 w-4" />
              Generate Cover Letter
            </Button>
            <Button variant="outline" className="flex-1">
              <Target className="mr-2 h-4 w-4" />
              Analyze Another Job
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MatchResults;