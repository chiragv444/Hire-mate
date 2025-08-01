import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Onboarding from "./pages/onboarding/Onboarding";
import UploadResume from "./pages/UploadResume";
import JobInput from "./pages/JobInput";
import MatchResults from "./pages/MatchResults";
import CoverLetter from "./pages/CoverLetter";
import Workspace from "./pages/Workspace";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              
              <Route path="/upload-resume" element={
                <ProtectedRoute>
                  <UploadResume />
                </ProtectedRoute>
              } />
              
              <Route path="/job-input" element={
                <ProtectedRoute>
                  <JobInput />
                </ProtectedRoute>
              } />
              
              <Route path="/match-results/:id" element={
                <ProtectedRoute>
                  <MatchResults />
                </ProtectedRoute>
              } />
              
              <Route path="/cover-letter/:id" element={
                <ProtectedRoute>
                  <CoverLetter />
                </ProtectedRoute>
              } />
              
              <Route path="/workspace" element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/workspace" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;