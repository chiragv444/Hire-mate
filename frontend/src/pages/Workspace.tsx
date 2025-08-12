import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  FileText,
  Target,
  Star,
  Calendar,
  Eye,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Users,
  Award
} from "lucide-react";

import {
  subscribeToUserAnalytics,
  deleteAnalysis,
  getUserAnalyticsForWorkspace,
  getWorkspaceStats,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

const Workspace = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    completed: 0,
    inProgress: 0,
    averageMatchScore: 0,
    averageATSScore: 0,
    greatFits: 0,
    possibleFits: 0,
    notFits: 0,
    thisWeek: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);

      const unsubscribe = subscribeToUserAnalytics(user.uid, (updatedAnalytics, updatedStats) => {
        setAnalytics(updatedAnalytics);
        setStats(updatedStats);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else if (!user) {
      setIsLoading(false);
    }
  }, [user]);

  const handleDeleteAnalysis = async (analysisId: string) => {
    if (!user?.uid) return;
    try {
      await deleteAnalysis(analysisId);
    } catch (error) {
      console.error("Failed to delete analysis:", error);
      setError("Failed to delete analysis. Please try again.");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return "bg-green-100";
    if (score >= 70) return "bg-orange-100";
    return "bg-red-100";
  };

  const getFitLevelBadge = (fitLevel: string) => {
    switch (fitLevel) {
      case 'Great Fit':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80">Great Fit</Badge>;
      case 'Possible Fit':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100/80">Possible Fit</Badge>;
      case 'Marginal Fit':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80">Marginal Fit</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100/80">Not Fit</Badge>;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_process':
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAndSortedAnalyses = analytics
    .filter((analysis) => {
      const jobTitle = analysis.job_description?.title || analysis.job_data?.jobTitle || '';
      const resumeName = analysis.resume?.filename || analysis.resume?.original_name || analysis.name || '';
      const matchesSearch = jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           resumeName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterBy === "all") return matchesSearch;
      if (filterBy === "completed") return matchesSearch && analysis.status === 'completed';
      if (filterBy === "in_progress") return matchesSearch && (analysis.status === 'in_process' || analysis.status === 'processing');
      if (filterBy === "great_fit") {
        const fitLevel = analysis.results?.enhanced_analysis?.fit_level || 
                        analysis.results?.basic_results?.fit_level || 'Not Fit';
        return matchesSearch && fitLevel === 'Great Fit';
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "score": 
          const scoreA = a.results?.enhanced_analysis?.match_score || a.results?.basic_results?.match_score || 0;
          const scoreB = b.results?.enhanced_analysis?.match_score || b.results?.basic_results?.match_score || 0;
          return scoreB - scoreA;
        case "ats": 
          const atsA = a.results?.enhanced_analysis?.ats_score || a.results?.basic_results?.ats_score || 0;
          const atsB = b.results?.enhanced_analysis?.ats_score || b.results?.basic_results?.ats_score || 0;
          return atsB - atsA;
        case "date":
        default:
          const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : 0;
          const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : 0;
          return dateB - dateA;
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-6 w-96 mb-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
            <div className="flex items-center space-x-4">
              <Link to="/new-analysis">
                <Button className="bg-purple-600 hover:bg-purple-700 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Analysis
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        {user?.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem><button className="w-full text-left" onClick={logout}>Logout</button></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.displayName?.split(" ")[0] || 'User'}! 👋
          </h2>
          <p className="text-gray-600">Track your resume analyses and improve your job match scores</p>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }} 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Analyses */}
          <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Analyses</CardTitle>
                <Eye className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
              <div className="text-xs text-gray-500">+{stats.thisWeek} this week</div>
            </CardContent>
          </Card>

          {/* Average Score */}
          <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.averageMatchScore}%</div>
              <div className="text-xs text-gray-500">Match Score</div>
            </CardContent>
          </Card>

          {/* Great Fits */}
          <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Great Fits</CardTitle>
                <Star className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.greatFits}</div>
              <div className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.greatFits / stats.total) * 100) : 0}% of total</div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.thisWeek}</div>
              <div className="text-xs text-gray-500">New analyses</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search analyses..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 w-64 border-gray-200 focus:border-purple-500 focus:ring-purple-500" 
              />
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-[180px] border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Analyses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="great_fit">Great Fits</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] border-gray-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Latest First</SelectItem>
              <SelectItem value="score">Match Score</SelectItem>
              <SelectItem value="ats">ATS Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Analysis Results */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.2 }} 
          className="space-y-4"
        >
          {filteredAndSortedAnalyses.length > 0 ? (
            filteredAndSortedAnalyses.map((analysis, index) => {
              const jobTitle = analysis.job_description?.title || analysis.job_data?.jobTitle || 'Untitled Job';
              const resumeName = analysis.resume?.filename || analysis.resume?.original_name || analysis.name || 'Unknown Resume';
              const matchScore = analysis.results?.enhanced_analysis?.match_score || analysis.results?.basic_results?.match_score || 0;
              const atsScore = analysis.results?.enhanced_analysis?.ats_score || analysis.results?.basic_results?.ats_score || 0;
              const fitLevel = analysis.results?.enhanced_analysis?.fit_level || analysis.results?.basic_results?.fit_level || 'Not Fit';
              const createdDate = analysis.created_at?.toDate ? analysis.created_at.toDate() : new Date(analysis.created_at);
              
              return (
                <motion.div 
                  key={analysis.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-lg text-gray-900 cursor-pointer hover:text-purple-600 transition-colors" 
                                  onClick={() => navigate(`/match-results/${analysis.id}`)}>
                                {jobTitle}
                              </h3>
                              {getFitLevelBadge(fitLevel)}
                            </div>
                            <Badge className={getStatusBadgeClass(analysis.status)}>
                              {analysis.status === 'completed' ? 'Completed' : 
                               analysis.status === 'in_process' ? 'In Progress' : 
                               analysis.status === 'processing' ? 'Processing' : 
                               analysis.status || 'Unknown'}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-4">
                            {resumeName} • {createdDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          
                          <div className="flex items-center gap-8 text-sm">
                            {/* Match Score */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Match Score</span>
                                <span className={`font-semibold ${getScoreColor(matchScore)}`}>
                                  {matchScore}%
                                </span>
                              </div>
                              <Progress 
                                value={matchScore} 
                                className="w-24 h-2" 
                                style={{
                                  '--progress-background': matchScore >= 85 ? '#10b981' : 
                                                          matchScore >= 70 ? '#f59e0b' : '#ef4444'
                                } as React.CSSProperties}
                              />
                            </div>
                            
                            {/* ATS Score */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">ATS Score</span>
                                <span className={`font-semibold ${getScoreColor(atsScore)}`}>
                                  {atsScore}%
                                </span>
                              </div>
                              <Progress 
                                value={atsScore} 
                                className="w-24 h-2"
                                style={{
                                  '--progress-background': atsScore >= 85 ? '#10b981' : 
                                                          atsScore >= 70 ? '#f59e0b' : '#ef4444'
                                } as React.CSSProperties}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Link to={`/match-results/${analysis.id}`}>
                            <Button variant="outline" size="sm" className="border-gray-300 hover:border-purple-500 hover:text-purple-600">
                              View Details
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link to={`/cover-letter/${analysis.id}`} className="flex items-center">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Generate Cover Letter
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => alert('Feature coming soon!')}>
                                <Target className="h-4 w-4 mr-2" />
                                Duplicate Analysis
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600" 
                                onClick={() => handleDeleteAnalysis(analysis.id)}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Delete Analysis
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses found</h3>
              <p className="text-gray-500 mb-6">Get started by creating a new analysis.</p>
              <Link to="/new-analysis">
                <Button className="bg-purple-600 hover:bg-purple-700 shadow-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Analysis
                </Button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Workspace;
