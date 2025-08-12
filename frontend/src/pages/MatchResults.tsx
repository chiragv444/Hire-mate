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
  Award
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { getAnalyticsData } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

const MatchResults = () => {
  const { id: analyticsId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Fetch analytics data
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getAnalyticsData(analyticsId);
        
        if (data && data.user_id === user.uid) {
          setAnalytics(data);
        } else if (data && data.user_id !== user.uid) {
          setError('Access denied: This analysis belongs to another user');
        } else {
          setError('Analysis not found');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setError('Failed to load analysis results');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
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
  
  // Extract enhanced analysis results
  const enhancedResults = results.enhanced_analysis || {};
  const basicResults = results.basic_results || {};
  
  // Use enhanced results if available, fallback to basic results
  const matchScore = enhancedResults.match_score || basicResults.match_score || 0;
  const atsScore = enhancedResults.ats_score || basicResults.ats_score || 0;
  const fitLevel = enhancedResults.fit_level || basicResults.fit_level || 'Not Fit';
  
  // Extract missing keywords and suggestions
  const missingKeywords = enhancedResults.missing_keywords || basicResults.missing_skills || [];
  const suggestions = enhancedResults.suggestions || basicResults.suggestions || [];
  const atsFeedback = enhancedResults.ats_feedback || basicResults.improvements || [];
  
  // Extract additional enhanced data
  const keywordAnalysis = enhancedResults.keyword_analysis || {};
  const skillAnalysis = enhancedResults.skill_analysis || {};
  const atsEvaluation = enhancedResults.ats_evaluation || {};
  const experienceAlignment = enhancedResults.experience_alignment || {};
  
  // Get job and resume information
  const jobDescription = analytics.job_description || {};
  const resumeData = analytics.resume || {};
  const jobTitle = jobDescription.title || 'Job Position';
  const companyName = jobDescription.company || 'Company';
  const resumeName = resumeData.filename || resumeData.original_name || 'Resume';
  
  // Format date
  const analysisDate = analytics.created_at ? 
    new Date(analytics.created_at.toMillis()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : 'Recent';

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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{jobTitle}</h1>
            <div className="flex items-center text-sm text-gray-500">
              <span>Analysis for {resumeName}</span>
              <span className="mx-2">•</span>
              <span>{analysisDate}</span>
              <div className="ml-auto flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  fitLevel === 'Great Fit' ? 'bg-green-400' : 
                  fitLevel === 'Possible Fit' ? 'bg-orange-400' : 
                  'bg-red-400'
                }`}></div>
                <span className={`font-medium ${
                  fitLevel === 'Great Fit' ? 'text-green-600' : 
                  fitLevel === 'Possible Fit' ? 'text-orange-600' : 
                  'text-red-600'
                }`}>{fitLevel}</span>
              </div>
            </div>
          </div>

          {/* Enhanced Analysis Summary */}
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Match Score */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">{matchScore}%</div>
                    <div className="text-sm font-medium text-gray-700">Match Score</div>
                    <div className="text-xs text-gray-500 mt-1">Overall Compatibility</div>
                  </div>
                  
                  {/* ATS Score */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">{atsScore}%</div>
                    <div className="text-sm font-medium text-gray-700">ATS Score</div>
                    <div className="text-xs text-gray-500 mt-1">System Compatibility</div>
                  </div>
                  
                  {/* Skills Matched */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {skillAnalysis.skill_match_percentage || 0}%
                    </div>
                    <div className="text-sm font-medium text-gray-700">Skills Matched</div>
                    <div className="text-xs text-gray-500 mt-1">Relevant Competencies</div>
                  </div>
                  
                  {/* Experience Relevance */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {experienceAlignment.experience_relevance || 0}%
                    </div>
                    <div className="text-sm font-medium text-gray-700">Experience</div>
                    <div className="text-xs text-gray-500 mt-1">Work History Fit</div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-blue-200">
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" size="sm" className="bg-white">
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white">
                      <Share className="h-4 w-4 mr-2" />
                      Share Results
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white">
                      <Target className="h-4 w-4 mr-2" />
                      Analyze Another Job
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="missing" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
              <TabsTrigger value="missing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Missing Keywords</TabsTrigger>
              <TabsTrigger value="ats" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">ATS Feedback</TabsTrigger>
              <TabsTrigger value="suggestions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Suggestions</TabsTrigger>
              <TabsTrigger value="experience" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Experience</TabsTrigger>
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
                  
                  {atsFeedback.length > 0 ? (
                    <div className="space-y-4">
                      {atsFeedback.map((feedback: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="font-medium text-gray-900">ATS Optimization Tip</p>
                            <p className="text-sm text-gray-600">{feedback}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>Your resume appears to be well-optimized for ATS systems!</p>
                    </div>
                  )}
                  
                  {/* Enhanced ATS Metrics */}
                  {atsEvaluation.overall_ats_score && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Detailed ATS Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {atsEvaluation.formatting_score || 0}%
                          </div>
                          <div className="text-sm text-gray-600">Formatting</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {atsEvaluation.keyword_density || 0}%
                          </div>
                          <div className="text-sm text-gray-600">Keyword Density</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {atsEvaluation.structure_score || 0}%
                          </div>
                          <div className="text-sm text-gray-600">Structure</div>
                        </div>
                      </div>
                    </div>
                  )}
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
                    <h3 className="text-lg font-semibold text-gray-900">Strategic Recommendations</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Professional recommendations to improve your match score and overall application strength</p>
                  
                  {suggestions.length > 0 ? (
                    <div className="space-y-4">
                      {suggestions.map((suggestion: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="font-medium text-gray-900">Strategic Action</p>
                            <p className="text-sm text-gray-600">{suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                      <p>Your resume appears to be a strong match for this position!</p>
                    </div>
                  )}
                  
                  {/* Enhanced Skill Analysis */}
                  {skillAnalysis.skill_match_percentage && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3">Skill Match Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {skillAnalysis.skill_match_percentage}%
                          </div>
                          <div className="text-sm text-blue-700">Skills Matched</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {skillAnalysis.missing_skills?.length || 0}
                          </div>
                          <div className="text-sm text-orange-700">Skills to Develop</div>
                        </div>
                      </div>
                      
                      {skillAnalysis.matching_skills && skillAnalysis.matching_skills.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-blue-900 mb-2">Your Strong Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {skillAnalysis.matching_skills.slice(0, 8).map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experience" className="mt-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Experience Alignment</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">How well your experience aligns with the job requirements and career progression</p>
                  
                  {/* Experience Relevance Score */}
                  {experienceAlignment.experience_relevance && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-purple-900">Experience Relevance</h4>
                        <span className="text-2xl font-bold text-purple-600">
                          {experienceAlignment.experience_relevance}%
                        </span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-3">
                        <div 
                          className="bg-purple-500 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${experienceAlignment.experience_relevance}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-purple-700 mt-2">
                        Your experience is {experienceAlignment.experience_relevance >= 70 ? 'highly' : 
                         experienceAlignment.experience_relevance >= 50 ? 'moderately' : 'minimally'} relevant to this role
                      </p>
                    </div>
                  )}
                  
                  {/* Experience Highlights */}
                  {experienceAlignment.experience_highlighting && experienceAlignment.experience_highlighting.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Experience to Emphasize</h4>
                      <div className="space-y-3">
                        {experienceAlignment.experience_highlighting.map((highlight: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm text-gray-700">{highlight}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Experience Gaps */}
                  {experienceAlignment.experience_gaps && experienceAlignment.experience_gaps.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Areas for Development</h4>
                      <div className="space-y-3">
                        {experienceAlignment.experience_gaps.map((gap: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm text-gray-700">{gap}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!experienceAlignment.experience_relevance && !experienceAlignment.experience_highlighting && !experienceAlignment.experience_gaps && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                      <p>Experience analysis not available for this analysis</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom Action Buttons */}
          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
              <FileDown className="mr-2 h-4 w-4" />
              Download Enhanced Resume
            </Button>
            <Button variant="outline" className="flex-1">
              <Target className="mr-2 h-4 w-4" />
              Analyze Another Job
            </Button>
            <Button variant="outline" className="flex-1">
              <Share className="mr-2 h-4 w-4" />
              Share Analysis
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MatchResults;