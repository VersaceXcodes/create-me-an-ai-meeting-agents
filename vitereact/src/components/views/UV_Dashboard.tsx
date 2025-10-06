import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on the provided Zod schemas
interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  assigned_agent_id: string | null;
}

interface MeetingSummary {
  id: string;
  meeting_id: string;
  generated_summary: string;
  generated_at: string;
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  deadline: string;
  status: string;
}

interface AiAgent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'paused';
}

interface UserMetrics {
  total_meeting_time: number;
  completion_rate: number;
  avg_sentiment: number;
}

interface AgentStatus {
  active: number;
  inactive: number;
  total: number;
}

const UV_Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual Zustand selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Loading states for different sections
  const [loadingStates, setLoadingStates] = useState({
    meetings: true,
    summaries: true,
    agents: true,
    actions: true,
    metrics: true,
  });

  // Refresh dashboard data function
  const refreshDashboardData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['upcoming_meetings'] });
    queryClient.invalidateQueries({ queryKey: ['recent_summaries'] });
    queryClient.invalidateQueries({ queryKey: ['agent_status'] });
    queryClient.invalidateQueries({ queryKey: ['pending_action_items'] });
    queryClient.invalidateQueries({ queryKey: ['user_metrics'] });
  }, [queryClient]);

  // API call for upcoming meetings
  const { data: upcomingMeetings, isLoading: meetingsLoading, error: meetingsError } = useQuery({
    queryKey: ['upcoming_meetings'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meetings`,
          {
            params: {
              status: 'scheduled',
              start_date: new Date().toISOString(),
              end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // next 7 days
              limit: 7,
              sort_by: 'start_time',
              sort_order: 'asc'
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        return response.data.meetings;
      },
      enabled: !!authToken,
      staleTime: 60000,
      refetchOnWindowFocus: false,
    });
  
    // API call for recent summaries
    const { data: recentSummaries, isLoading: summariesLoading } = useQuery({
    queryKey: ['recent_summaries'],
    queryFn: async () => {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meeting-summaries`,
          {
            params: {
              limit: 5,
              sort_order: 'desc'
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data.templates;
    },
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  
  // API call for agent status
  const { data: agentStatus, isLoading: agentsLoading } = useQuery({
    queryKey: ['agent_status'],
    queryFn: async () => {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents`,
          {
            params: {
              user_id: currentUser?.id,
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const agents = response.data.agents;
      return {
        active: agents.filter((a: AiAgent) => a.status === 'active').length,
        inactive: agents.filter((a: AiAgent) => a.status === 'inactive').length,
        total: agents.length,
      };
    },
    enabled: !!currentUser?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  
  // API call for pending action items
  const { data: pendingActionItems, isLoading: actionsLoading } = useQuery({
    queryKey: ['pending_action_items'],
    queryFn: async () => {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/action-items`,
          {
            params: {
              status: 'pending',
              limit: 10,
              sort_by: 'deadline',
              sort_order: 'asc'
            },
            headers: {
              Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data.action_items;
    },
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  
  // API call for user metrics
  const { data: userMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['user_metrics'],
    queryFn: async () => {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/dashboard`,
          {
            params: {
              date_range: 'current_week'
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const analyticsData = response.data;
      return {
        total_meeting_time: analyticsData.total_meeting_time,
          completion_rate: analyticsData.action_item_completion_rate,
          avg_sentiment: analyticsData.average_sentiment || 0,
      };
    },
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Real-time WebSocket connection setup
  useEffect(() => {
    if (!authToken) return;

    // Mock WebSocket setup - in real implementation would connect to actual WebSocket
    const ws = new WebSocket(`${import.meta.env.VITE_API_BASE_URL || 'ws://localhost:3000'}/ws`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        // Handle different real-time events
        switch (data.event_type) {
          case 'meeting_status_changed':
          case 'agent_join_status_changed':
          case 'live_transcript_update':
          case 'action_item_detected':
          case 'meeting_summary_generated':
          // Refresh relevant data when real-time events occur
          queryClient.invalidateQueries({ queryKey: ['upcoming_meetings'] });
          break;
        }
      };

      ws.addEventListener('message', handleMessage);
      
      return () => {
        ws.removeEventListener('message', handleMessage);
        ws.close();
      };
    }, [authToken, queryClient]);
  
  // Update loading states based on query status
  useEffect(() => {
    setLoadingStates({
      meetings: meetingsLoading,
      summaries: summariesLoading,
      agents: agentsLoading,
      actions: actionsLoading,
      metrics: metricsLoading,
      });
    }, [meetingsLoading, summariesLoading, agentsLoading, actionsLoading, metricsLoading]);
  
  // Navigation handlers
  const joinMeeting = (meetingId: string) => {
    // Navigate to active meeting
    window.location.href = `/meetings/${meetingId}/active`;
  };
  
  const createQuickAgent = () => {
    window.location.href = '/agents/create';
  };
  
  const scheduleMeeting = () => {
    window.location.href = '/meetings/setup';
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Filter data based on search query
  };
  
  // Filter data based on selected filter
  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {currentUser?.full_name || 'User'}!
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              }}>
                  {new Date().toLocaleString()}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  {userMetrics?.total_meeting_time || 0} minutes this week
              </span>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                <div className="bg-blue-500 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Meetings
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {upcomingMeetings?.length || 0}
                </p>
              </div>
              <div className="text-sm text-gray-900">
                  {agentStatus?.total || 0} Active Agents
              </p>
            </div>
          </div>
          
          {/* Search and Filter Section */}
          <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search dashboard..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                    selectedFilter === 'all' 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleFilterChange('meetings')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                    selectedFilter === 'meetings' 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Meetings
                  </button>
                  <button
                    onClick={() => handleFilterChange('actions')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                    selectedFilter === 'actions' 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Actions
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Upcoming Meetings Widget */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                Upcoming Meetings
              </h3>
              <div className="mt-2">
                {loadingStates.meetings ? (
                  <div className="animate-pulse flex space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    )
                  )}
                </div>
                ) : (
                  <>
                    {upcomingMeetings && upcomingMeetings.length > 0 ? (
                      <div className="space-y-4">
                      {upcomingMeetings.map((meeting) => (
                      <div key={meeting.id} className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {meeting.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                        {new Date(meeting.start_time).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">
                          {new Date(meeting.end_time).toLocaleTimeString()}
                      </p>
                      <button
                        onClick={() => joinMeeting(meeting.id)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded bg-green-100 text-green-800">
                          Join Meeting
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2H5z"/>
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No upcoming meetings
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Schedule your first meeting to get started
                        </p>
                        <button
                          onClick={scheduleMeeting}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-4">
                          Schedule Meeting
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Recent Activity Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Activity
              </h3>
              <div className="mt-2">
                {loadingStates.summaries ? (
                  <div className="animate-pulse flex space-y-4">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  )
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Items Widget */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Action Items
              </h3>
              <div className="mt-2">
                {loadingStates.actions ? (
                  <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4">
                {pendingActionItems && pendingActionItems.length > 0 ? (
                    <div className="space-y-4">
                    {pendingActionItems.map((action) => (
                      <div key={action.id} className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {action.description}
                        </h4>
                        <p className="text-xs text-gray-600">
                        Assignee: {action.assignee}
                      </p>
                      <p className="text-xs text-gray-500">
                          Due: {new Date(action.deadline).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          action.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {action.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 012 2h4a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2-2V5a2 2 0 012 2z"/>
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No action items pending
                        </h3>
                        <p className="text-xs text-gray-500">
                          You're all caught up! No pending action items.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Productivity Metrics Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Week in Review
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                          Meeting Time
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {userMetrics?.total_meeting_time || 0}m
                      </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900">
                          Completion Rate
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {userMetrics?.completion_rate || 0}%
                      </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-900">
                          Sentiment Score
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {userMetrics?.avg_sentiment || 0}/5
                      </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-900">
                          {userMetrics?.avg_sentiment || 0}/5
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="fixed bottom-6 right-6 z-50">
              <div className="flex flex-col space-y-3">
                <button
                  onClick={createQuickAgent}
                  className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  Create Agent
                </button>
                <button
                  onClick={scheduleMeeting}
                  className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Schedule Meeting
                </button>
                <Link
                  to="/analytics"
                  className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 012 2h6a2 2 0 012 2v6a2 2 0 01-2-2H5a2 2 0 01-2-2z"/>
                  </svg>
                  View Analytics
                </Link>
              </div>
            </div>
        </main>
      </div>
    </>
  );
};

export default UV_Dashboard;