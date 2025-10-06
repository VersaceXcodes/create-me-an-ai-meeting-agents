import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Import global shared views
import GV_AuthenticationModal from '@/components/views/GV_AuthenticationModal.tsx';
import GV_TopNavigation from '@/components/views/GV_TopNavigation.tsx';
import GV_SidebarNavigation from '@/components/views/GV_SidebarNavigation.tsx';
import GV_BottomFooter from '@/components/views/GV_BottomFooter.tsx';

// Import unique views
import UV_LandingPage from '@/components/views/UV_LandingPage.tsx';
import UV_Registration from '@/components/views/UV_Registration.tsx';
import UV_Login from '@/components/views/UV_Login.tsx';
import UV_PasswordReset from '@/components/views/UV_PasswordReset.tsx';
import UV_Dashboard from '@/components/views/UV_Dashboard.tsx';
import UV_AgentCreation from '@/components/views/UV_AgentCreation.tsx';
import UV_AgentManagement from '@/components/views/UV_AgentManagement.tsx';
import UV_AgentConfiguration from '@/components/views/UV_AgentConfiguration.tsx';
import UV_CalendarIntegration from '@/components/views/UV_CalendarIntegration.tsx';
import UV_MeetingSetup from '@/components/views/UV_MeetingSetup.tsx';
import UV_ActiveMeeting from '@/components/views/UV_ActiveMeeting.tsx';
import UV_PostMeetingReview from '@/components/views/UV_PostMeetingReview.tsx';
import UV_MeetingHistory from '@/components/views/UV_MeetingHistory.tsx';
import UV_ActionItems from '@/components/views/UV_ActionItems.tsx';
import UV_AnalyticsDashboard from '@/components/views/UV_AnalyticsDashboard.tsx';
import UV_ProfileSettings from '@/components/views/UV_ProfileSettings.tsx';
import UV_AppSettings from '@/components/views/UV_AppSettings.tsx';
import UV_SupportHelp from '@/components/views/UV_SupportHelp.tsx';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Loading component for auth initialization
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Protected Route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Layout component for authenticated views
const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <GV_TopNavigation />
      <div className="flex flex-1 pt-16"> {/* pt-16 to account for fixed top nav */}
        <GV_SidebarNavigation />
        <main className="flex-1 p-6 ml-64"> {/* ml-64 to account for sidebar */}
          {children}
        </main>
      </div>
      <GV_BottomFooter />
    </div>
  );
};

// Layout component for unauthenticated views
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {children}
      </main>
      <GV_BottomFooter />
    </div>
  );
};

const App: React.FC = () => {
  // CRITICAL: Individual selectors, no object destructuring
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const initializeAuth = useAppStore(state => state.initialize_auth);
  
  useEffect(() => {
    // Initialize auth state when app loads
    initializeAuth();
  }, [initializeAuth]);
  
  // Show loading spinner during initial auth check
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          {/* Authentication Modal - conditionally rendered based on auth state */}
          <GV_AuthenticationModal />
          
          <Routes>
            {/* Public Routes - No authentication required */}
            <Route 
              path="/" 
              element={
                <PublicLayout>
                  <UV_LandingPage />
                </PublicLayout>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicLayout>
                  <UV_Registration />
                </PublicLayout>
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicLayout>
                  <UV_Login />
                </PublicLayout>
              } 
            />
            <Route 
              path="/password-reset" 
              element={
                <PublicLayout>
                  <UV_PasswordReset />
                </PublicLayout>
              } 
            />
            
            {/* Protected Routes - Authentication required */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_Dashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agents/create" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_AgentCreation />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agents" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_AgentManagement />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agents/:id/config" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_AgentConfiguration />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_CalendarIntegration />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meetings/setup" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_MeetingSetup />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meetings/active" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_ActiveMeeting />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meetings/review" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_PostMeetingReview />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meetings/history" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_MeetingHistory />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/action-items" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_ActionItems />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_AnalyticsDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_ProfileSettings />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_AppSettings />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/support" 
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <UV_SupportHelp />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all routes - redirect based on authentication status */}
            <Route 
              path="*" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/" replace />
              } 
            />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
};

export default App;