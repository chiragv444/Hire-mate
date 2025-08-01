import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar,
  TrendingUp,
  FileText,
  Target,
  Star
} from 'lucide-react';

import { getAnalysisHistory } from '@/lib/api';
import { ResumeAnalysis } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';

const Workspace = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const data = await getAnalysisHistory();
      setAnalyses(data);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFitLevelColor = (fitLevel: string) => {
    switch (fitLevel) {
      case 'Great Fit': return 'bg-success text-white';
      case 'Possible Fit': return 'bg-warning text-white';
      case 'Not Fit': return 'bg-error text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  const filteredAnalyses = analyses
    .filter(analysis => {
      const matchesSearch = analysis.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           analysis.resumeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterBy === 'all' || analysis.fitLevel === filterBy;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.matchScore - a.matchScore;
        case 'ats':
          return b.atsScore - a.atsScore;
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const stats = {
    totalAnalyses: analyses.length,
    averageScore: analyses.reduce((sum, a) => sum + a.matchScore, 0) / analyses.length || 0,
    greatFitCount: analyses.filter(a => a.fitLevel === 'Great Fit').length,
    recentCount: analyses.filter(a => {
      const daysDiff = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gradient">Workspace</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/upload-resume">
              <Button className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.fullName} />
                    <AvatarFallback>{user?.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.fullName?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Track your resume analyses and improve your job match scores
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.recentCount} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {Math.round(stats.averageScore)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all analyses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Great Fits</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.greatFitCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAnalyses > 0 ? Math.round((stats.greatFitCount / stats.totalAnalyses) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentCount}</div>
              <p className="text-xs text-muted-foreground">
                New analyses
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search analyses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by fit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Analyses</SelectItem>
              <SelectItem value="Great Fit">Great Fit</SelectItem>
              <SelectItem value="Possible Fit">Possible Fit</SelectItem>
              <SelectItem value="Not Fit">Not Fit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Latest First</SelectItem>
              <SelectItem value="score">Highest Score</SelectItem>
              <SelectItem value="ats">Best ATS Score</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Analyses List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredAnalyses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analyses found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterBy !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Start by uploading your resume and analyzing job matches'
                  }
                </p>
                <Link to="/upload-resume">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Analysis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredAnalyses.map((analysis, index) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{analysis.jobTitle}</h3>
                          <Badge className={getFitLevelColor(analysis.fitLevel)}>
                            {analysis.fitLevel}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3">
                          {analysis.resumeName} • {new Date(analysis.createdAt).toLocaleDateString()}
                        </p>

                        <div className="flex items-center gap-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Match Score</span>
                              <span className={`font-semibold ${getScoreColor(analysis.matchScore)}`}>
                                {analysis.matchScore}%
                              </span>
                            </div>
                            <Progress value={analysis.matchScore} className="w-24 h-2" />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">ATS Score</span>
                              <span className={`font-semibold ${getScoreColor(analysis.atsScore)}`}>
                                {analysis.atsScore}%
                              </span>
                            </div>
                            <Progress value={analysis.atsScore} className="w-24 h-2" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Link to={`/match-results/${analysis.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/cover-letter/${analysis.id}`}>
                                Generate Cover Letter
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Duplicate Analysis
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-error">
                              Delete Analysis
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Workspace;