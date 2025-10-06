import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas
interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string | null;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string | null;
  meeting_type: string | null;
}

interface AiAgent {
  id: string;
  user_id: string;
  name: string;
  meeting_type: string;
  status: 'active' | 'inactive' | 'paused';
  participation_level: 'observer' | 'active_participant' | 'passive_observer';
  primary_objectives: string;
  voice_settings: string | null;
  custom_instructions: string | null;
  speaking_triggers: string | null;
  note_taking_focus: string | null;
  follow_up_templates: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DefaultAssignment {
  meeting_type: string;
  agent_id: string | null;
}

interface SyncStatus {
  is_syncing: boolean;
  last_sync: string | null;
  error: string | null;
}

const UV_CalendarIntegration: React.FC = () => {
  // Global state
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Local state
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    is_syncing: false,
    last_sync: null,
    error: null
  });
  const [defaultAssignments, setDefaultAssignments] = useState<DefaultAssignment[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'microsoft'>('google');

  const queryClient = useQueryClient();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Fetch calendar integrations
  const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError } = useQuery({
    queryKey: ['calendarIntegrations'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/integrations/calendar`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user's agents for default assignments
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['userAgents'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/agents`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    enabled: !!authToken,
  });

  // Mutations
  const connectCalendarMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await axios.post(`${API_BASE_URL}/api/integrations/calendar`, {
        user_id: currentUser?.id,
        provider,
        is_connected: true
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarIntegrations'] });
      setSyncStatus(prev => ({ ...prev, error: null }));
    },
    onError: (error: any) => {
      setSyncStatus(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to connect calendar'
      }));
    }
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      await axios.delete(`${API_BASE_URL}/api/integrations/calendar/${integrationId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return integrationId;
    },
    onSuccess: (integrationId) => {
      queryClient.invalidateQueries({ queryKey: ['calendarIntegrations'] });
      setCalendarIntegrations(prev => prev.filter(integration => integration.id !== integrationId));
    }
  });

  // Sync calendar events (mock implementation since endpoint is missing)
  const syncCalendarEvents = async () => {
    setSyncStatus(prev => ({ ...prev, is_syncing: true, error: null }));
    
    try {
      // Mock calendar events data since endpoint is missing
      const mockEvents: CalendarEvent[] = [
        {
          id: 'event_1',
          title: 'Team Standup',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          description: 'Daily team sync',
          meeting_type: 'team_meeting'
        },
        {
          id: 'event_2',
          title: 'Client Review',
          start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
          description: 'Quarterly client review meeting',
          meeting_type: 'client_meeting'
        }
      ];

      setCalendarEvents(mockEvents);
      setSyncStatus({
        is_syncing: false,
        last_sync: new Date().toISOString(),
        error: null
      });
    } catch (error: any) {
      setSyncStatus({
        is_syncing: false,
        last_sync: null,
        error: error.response?.data?.message || 'Failed to sync calendar events'
      });
    }
  };

  // Update default assignment
  const updateDefaultAssignment = (meetingType: string, agentId: string | null) => {
    setDefaultAssignments(prev => {
      const existing = prev.find(item => item.meeting_type === meetingType);
      if (existing) {
        return prev.map(item =>
          item.meeting_type === meetingType ? { ...item, agent_id: agentId } : item
        );
      } else {
        return [...prev, { meeting_type: meetingType, agent_id: agentId }];
      }
    });
  };

  // Initialize default assignments from integrations data
  useEffect(() => {
    if (integrationsData) {
      setCalendarIntegrations(integrationsData);
    }
  }, [integrationsData]);

  // Initialize mock default assignments
  useEffect(() => {
    const mockAssignments: DefaultAssignment[] = [
      { meeting_type: 'team_meeting', agent_id: null },
      { meeting_type: 'client_meeting', agent_id: null },
      { meeting_type: 'one_on_one', agent_id: null },
      { meeting_type: 'brainstorming', agent_id: null },
      { meeting_type: 'review', agent_id: null }
    ];
    setDefaultAssignments(mockAssignments);
  }, []);

  const isGoogleConnected = calendarIntegrations.some(integration => 
    integration.provider === 'google' && integration.is_connected
  );
  
  const isMicrosoftConnected = calendarIntegrations.some(integration => 
    integration.provider === 'microsoft' && integration.is_connected
  );

  const connectedIntegrations = calendarIntegrations.filter(integration => integration.is_connected);

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar Integration</h1>
              <p className="mt-2 text-gray-600">
                Connect your calendars to automatically detect meetings and assign AI agents
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Connection Status & Sync Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Connection Status */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar Connections</h2>
              
              {/* Google Calendar Integration */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.22.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Google Calendar</h3>
                      <p className="text-sm text-gray-500">Connect your Google account</p>
                    </div>
                  </div>
                  <div>
                    {isGoogleConnected ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </span>
                        <button
                          onClick={() => {
                            const googleIntegration = calendarIntegrations.find(i => i.provider === 'google');
                            if (googleIntegration) {
                              disconnectCalendarMutation.mutate(googleIntegration.id);
                            }
                          }}
                          disabled={disconnectCalendarMutation.isPending}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {disconnectCalendarMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => connectCalendarMutation.mutate('google')}
                        disabled={connectCalendarMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {connectCalendarMutation.isPending ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Microsoft Outlook Integration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.22.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Microsoft Outlook</h3>
                      <p className="text-sm text-gray-500">Connect your Microsoft account</p>
                    </div>
                  </div>
                  <div>
                    {isMicrosoftConnected ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </span>
                        <button
                          onClick={() => {
                            const microsoftIntegration = calendarIntegrations.find(i => i.provider === 'microsoft');
                            if (microsoftIntegration) {
                              disconnectCalendarMutation.mutate(microsoftIntegration.id);
                            }
                          }}
                          disabled={disconnectCalendarMutation.isPending}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {disconnectCalendarMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => connectCalendarMutation.mutate('microsoft')}
                        disabled={connectCalendarMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {connectCalendarMutation.isPending ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Controls */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Last Sync</span>
                  <span className="text-sm text-gray-500">
                    {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString() : 'Never'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <span className={`text-sm font-medium ${
                    syncStatus.is_syncing ? 'text-yellow-600' : 
                    syncStatus.error ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {syncStatus.is_syncing ? 'Syncing...' : 
                     syncStatus.error ? 'Error' : 'Idle'}
                  </span>
                </div>
              </div>

              {syncStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{syncStatus.error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={syncCalendarEvents}
                disabled={syncStatus.is_syncing || connectedIntegrations.length === 0}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {syncStatus.is_syncing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Sync Calendar Events'
                )}
              </button>

              {connectedIntegrations.length === 0 && (
                <p className="text-xs text-gray-500 text-center">
                  Connect at least one calendar to sync events
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Events & Default Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Events */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Calendar Events</h2>
            </div>
            <div className="p-6">
              {calendarEvents.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No calendar events</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {connectedIntegrations.length === 0 
                      ? 'Connect a calendar and sync to see your events' 
                      : 'Sync your calendar to see upcoming events'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calendarEvents.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                          )}
                        </div>
                        <Link
                          to="/meetings/setup"
                          state={{ calendarEvent: event }}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Setup
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Default Agent Assignments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Default Agent Assignments</h2>
            </div>
            <div className="p-6">
              {agentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading agents...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {defaultAssignments.map((assignment) => (
                    <div key={assignment.meeting_type} className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 capitalize">
                          {assignment.meeting_type.replace('_', ' ')}
                        </label>
                      </div>
                      <div className="w-48">
                        <select
                          value={assignment.agent_id || ''}
                          onChange={(e) => updateDefaultAssignment(assignment.meeting_type, e.target.value || null)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="">No default agent</option>
                          {agentsData?.agents?.filter((agent: AiAgent) => agent.status === 'active').map((agent: AiAgent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Save default assignments (mock implementation since endpoint is missing)
                    console.log('Saving default assignments:', defaultAssignments);
                    // Show success message
                    setSyncStatus(prev => ({
                      ...prev,
                      error: null
                    }));
                  }}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Handling */}
        {(integrationsError || connectCalendarMutation.isError || disconnectCalendarMutation.isError) && (
          <div className="mt-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {integrationsError ? 'Failed to load calendar integrations' :
                     connectCalendarMutation.isError ? 'Failed to connect calendar' :
                     disconnectCalendarMutation.isError ? 'Failed to disconnect calendar' : 'Unknown error'}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      {integrationsError ? 'Please try refreshing the page.' :
                       connectCalendarMutation.isError ? (connectCalendarMutation.error as any)?.message || 'Please try again.' :
                       disconnectCalendarMutation.isError ? (disconnectCalendarMutation.error as any)?.message || 'Please try again.' : 'Unknown error occurred.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_CalendarIntegration;