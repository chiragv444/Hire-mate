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
} from "lucide-react";

import {
  subscribeToUserAnalyses,
  deleteAnalysis,
  getAnalysisStats,
  AnalysisDocument,
  AnalysisStats,
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
  const [analyses, setAnalyses] = useState<AnalysisDocument[]>([]);
  const [stats, setStats] = useState<AnalysisStats>({ total: 0, completed: 0, averageScore: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);

      const unsubscribe = subscribeToUserAnalyses(user.uid, (updatedAnalyses, error) => {
        if (error) {
          console.error("Failed to subscribe to analyses:", error);
          setError("Failed to load real-time data. Please refresh the page.");
          setIsLoading(false);
          return;
        }
        
        setAnalyses(updatedAnalyses);
        // Also update stats whenever analyses change
        getAnalysisStats(user.uid)
          .then(setStats)
          .catch(err => console.error("Failed to update stats:", err));
        
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
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-error";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAndSortedAnalyses = analyses
    .filter((analysis) => {
      const jobTitle = analysis.job_data?.jobTitle || '';
      const resumeName = analysis.name || '';
      const matchesSearch = jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) || resumeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterBy === "all" || analysis.status === filterBy;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "score": return (b.match_results?.score || 0) - (a.match_results?.score || 0);
        case "ats": return (b.match_results?.atsScore || 0) - (a.match_results?.atsScore || 0);
        case "date":
        default:
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
      }
    });

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Loading Workspace...</h1>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient">Workspace</h1>
          <div className="flex items-center space-x-4">
            <Link to="/new-analysis">
              <Button className="shadow-sm"><Plus className="h-4 w-4 mr-2" />New Analysis</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
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
      </header>

      <main className="container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.displayName?.split(" ")[0] || 'User'}! 👋</h2>
          <p className="text-muted-foreground">Track your resume analyses and improve your job match scores</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.completed}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Match Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.averageScore ? stats.averageScore.toFixed(1) : '0'}%</div></CardContent>
          </Card>
        </motion.div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by job or resume..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="score">Match Score</SelectItem>
              <SelectItem value="ats">ATS Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
          {filteredAndSortedAnalyses.length > 0 ? (
            filteredAndSortedAnalyses.map((analysis, index) => (
              <motion.div key={analysis.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg cursor-pointer" onClick={() => navigate(`/match-results/${analysis.id}`)}>{analysis.job_data?.jobTitle || 'Untitled Job'}</h3>
                          <Badge className={getStatusBadgeClass(analysis.status || 'N/A')}>{analysis.status}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4">{analysis.name || 'Unknown Resume'} • {analysis.createdAt?.toDate?.().toLocaleDateString() || 'Unknown Date'}</p>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Match</span>
                              <span className={`font-semibold ${getScoreColor(analysis.match_results?.score || 0)}`}>{analysis.match_results?.score || 0}%</span>
                            </div>
                            <Progress value={analysis.match_results?.score || 0} className="w-24 h-2" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">ATS</span>
                              <span className={`font-semibold ${getScoreColor(analysis.match_results?.atsScore || 0)}`}>{analysis.match_results?.atsScore || 0}%</span>
                            </div>
                            <Progress value={analysis.match_results?.atsScore || 0} className="w-24 h-2" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link to={`/match-results/${analysis.id}`}><Button variant="outline" size="sm">View Details</Button></Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link to={`/cover-letter/${analysis.id}`}>Generate Cover Letter</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => alert('Feature coming soon!')}>Duplicate Analysis</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteAnalysis(analysis.id)}>Delete Analysis</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No analyses found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new analysis.</p>
              <div className="mt-6">
                <Link to="/new-analysis"><Button><Plus className="mr-2 h-4 w-4" /> New Analysis</Button></Link>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Workspace;
