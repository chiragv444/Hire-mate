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
  const [isScrolled, setIsScrolled] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80 text-xs px-2 py-1">Great Fit</Badge>;
      case 'Possible Fit':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100/80 text-xs px-2 py-1">Possible Fit</Badge>;
      case 'Marginal Fit':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80 text-xs px-2 py-1">Marginal Fit</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100/80 text-xs px-2 py-1">Not Fit</Badge>;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 text-xs px-2 py-1';
      case 'in_process':
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-1';
      case 'error':
      case 'failed': return 'bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 text-xs px-2 py-1';
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
      {/* Glass Header */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled 
          ? 'glass-header-scrolled' 
          : 'glass-header'
      }`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
            <div className="flex items-center space-x-4">
              <Link to="/new-analysis">
                <Button className="bg-purple-600 hover:bg-purple-700 shadow-sm text-white">
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
                <DropdownMenuContent className="w-56 glass-dropdown" align="end" forceMount>
                  <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
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

        {/* Enhanced Stats Cards - Fixed to match Figma */}
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
              <div className="text-2xl font-bold text-green-600 mb-1">{stats.greatFits}</div>
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

        {/* Search and Filter Section - Fixed to match Figma */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }} 
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search analyses by job title or resume name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-32 h-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dropdown">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="great_fit">Great Fits</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dropdown">
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="ats">ATS Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Analyses List - Fixed to match Figma */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }} 
          className="space-y-4"
        >
          {filteredAndSortedAnalyses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analyses found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterBy !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Start your first analysis to see results here"
                  }
                </p>
                {!searchTerm && filterBy === "all" && (
                  <Link to="/new-analysis">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Start Analysis
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedAnalyses.map((analysis) => (
              <Card key={analysis.id} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        {analysis.status === 'completed' ? (
                          <Link 
                            to={`/match-results/${analysis.id}`}
                            className="text-lg font-semibold text-gray-900 truncate hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            {analysis.job_description?.title || analysis.job_data?.jobTitle || 'Untitled Analysis'}
                          </Link>
                        ) : analysis.status === 'in_process' || analysis.status === 'processing' ? (
                          <Link 
                            to={`/new-analysis?analysis-id=${analysis.id}`}
                            className="text-lg font-semibold text-gray-900 truncate hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            {analysis.job_description?.title || analysis.job_data?.jobTitle || 'Untitled Analysis'}
                          </Link>
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {analysis.job_description?.title || analysis.job_data?.jobTitle || 'Untitled Analysis'}
                          </h3>
                        )}
                        {getFitLevelBadge(
                          analysis.results?.enhanced_analysis?.fit_level || 
                          analysis.results?.basic_results?.fit_level || 'Not Fit'
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-4">
                        {analysis.resume?.filename || analysis.resume?.original_name || analysis.name || 'Resume'} • {
                          analysis.created_at?.toDate ? 
                          analysis.created_at.toDate().toLocaleDateString() : 
                          new Date(analysis.created_at).toLocaleDateString()
                        }
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Match Score</div>
                          <div className={`text-xl font-bold text-purple-600`}>
                            {(analysis.results?.enhanced_analysis?.match_score || 
                             analysis.results?.basic_results?.match_score || 0).toFixed(2)}%
                          </div>
                          <Progress 
                            value={analysis.results?.enhanced_analysis?.match_score || 
                                   analysis.results?.basic_results?.match_score || 0} 
                            className="mt-2 h-1.5 bg-gray-200"
                            style={{
                              '--progress-foreground': '#8B5CF6'
                            } as React.CSSProperties}
                          />
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-600 mb-2">ATS Score</div>
                          <div className={`text-xl font-bold text-green-600`}>
                            {(analysis.results?.enhanced_analysis?.ats_score || 
                             analysis.results?.basic_results?.ats_score || 0).toFixed(2)}%
                          </div>
                          <Progress 
                            value={analysis.results?.enhanced_analysis?.ats_score || 
                                   analysis.results?.basic_results?.ats_score || 0} 
                            className="mt-2 h-1.5 bg-gray-200"
                            style={{
                              '--progress-foreground': '#8B5CF6'
                            } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-6">
                      <Badge className={getStatusBadgeClass(analysis.status)}>
                        {analysis.status === 'completed' ? 'Completed' : 
                         analysis.status === 'in_process' || analysis.status === 'processing' ? 'In Progress' : 
                         analysis.status}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="glass-dropdown" align="end">
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Cover Letter
                          </DropdownMenuItem>
                          {/* <DropdownMenuItem>
                            <Target className="h-4 w-4 mr-2" />
                            Duplicate Analysis
                          </DropdownMenuItem> */}
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
            ))
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Workspace;
