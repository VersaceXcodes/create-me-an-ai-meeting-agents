import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Types for our settings data
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

interface DefaultAgentSettings {
  meeting_type: string;
  participation_level: string;
  primary_objectives: string;
}

interface DataRetentionSettings {
  meeting_data_retention_days: number;
  transcript_data_retention_days: number;
  recording_data_retention_days: number;
}

interface FormErrors {
  [key: string]: string;
}

const UV_AppSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const globalCalendarIntegrations = useAppStore(state => state.calendar_integrations);

  // Local state
  const [activeTab, setActiveTab] = useState('calendar');
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [defaultAgentSettings, setDefaultAgentSettings] = useState<DefaultAgentSettings>({
    meeting_type: '',
    participation_level: 'observer',
    primary_objectives: '',
  });
  const [dataRetentionSettings, setDataRetentionSettings] = useState<DataRetentionSettings>({
    meeting_data_retention_days: 365,
    transcript_data_retention_days: 90,
    recording_data_retention_days: 30,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Clear notification after timeout
  useEffect(() => {
    if (notificationMessage) {
      const timer = setTimeout(() => {
        setNotificationMessage(null);
      }, 5000);
    return () => clearTimeout(timer);
  }, [notificationMessage]);

  // Load calendar integrations on mount
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendarIntegrations', currentUser?.id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/integrations/calendar`,
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      );
      return response.data;
    },
    enabled: !!authToken && !!currentUser?.id,
  });

  useEffect(() => {
    if (calendarData) {
      setCalendarIntegrations(calendarData);
    }
  }, [calendarData]);

  // Mutations for API calls
  const connectCalendarMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/integrations/calendar`,
        {
          provider,
          user_id: currentUser?.id,
        },
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
          },
      );
      return response.data;
    },
    onSuccess: (data) => {
      setCalendarIntegrations(prev => [...prev, data]);
      setNotificationMessage({
        type: 'success',
        message: `Successfully connected ${provider} calendar`
      });
    },
    onError: (error: any) => {
      setNotificationMessage({
        type: 'error',
        message: error.response?.data?.message || 'Failed to connect calendar'
      });
    },
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/integrations/calendar/${integrationId}`,
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
    },
    onSuccess: () => {
      setCalendarIntegrations(prev => prev.filter(integration => integration.id !== integrationId));
      setNotificationMessage({
        type: 'info',
        message: 'Calendar integration disconnected'
      });
    },
    onError: (error: any) => {
      setNotificationMessage({
        type: 'error',
        message: 'Failed to disconnect calendar'
      });
    },
  });

  const updateDefaultAgentSettingsMutation = useMutation({
    mutationFn: async (settings: DefaultAgentSettings) => {
      // Missing endpoint - using mock success for now
      return new Promise<DefaultAgentSettings>((resolve) => {
        setTimeout(() => resolve(settings), 1000);
      });
    },
  });

  // Handlers
  const handleConnectCalendar = async (provider: string) => {
    setIsLoading(true);
    setErrors({});
    
    try {
      await connectCalendarMutation.mutateAsync(provider);
      setSaveSuccess(true);
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectCalendar = async (integrationId: string) => {
    setIsLoading(true);
    setShowDisconnectConfirm(null);
    
    try {
      await disconnectCalendarMutation.mutateAsync(provider));
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleUpdateDefaultAgentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    
    // Validate form
    const newErrors: FormErrors = {};
    if (!defaultAgentSettings.meeting_type) {
      newErrors.meeting_type = 'Meeting type is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }
    
    try {
      await updateDefaultAgentSettingsMutation.mutateAsync(defaultAgentSettings);
      setSaveSuccess(true);
      setNotificationMessage({
        type: 'success',
        message: 'Default agent settings updated successfully'
      });
    } catch (error) {
      setNotificationMessage({
        type: 'error',
        message: 'Default agent settings saved'
      });
    } catch (error) {
      setNotificationMessage({
        type: 'error',
        message: 'Failed to update default agent settings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDataRetentionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Missing endpoint - using mock success for now
      setTimeout(() => {
      setSaveSuccess(true);
      setNotificationMessage({
        type: 'success',
        message: 'Data retention settings updated'
      });
    } catch (error) {
      setNotificationMessage({
        type: 'error',
        message: 'Failed to update data retention settings'
      });
    }
  };

  const handleExportApplicationData = async () => {
    setIsLoading(true);
    
    try {
      // Missing endpoint - using mock export for now
      const exportData = {
        user: currentUser,
        calendar_integrations,
        default_agent_settings: defaultAgentSettings,
        data_retention_settings: dataRetentionSettings,
        exported_at: new Date().toISOString(),
      };
      
      // Create and download a blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meetmate_data_export_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      setSaveSuccess(true);
      setNotificationMessage({
        type: 'success',
        message: 'Data export initiated successfully'
      });
    } catch (error) {
      setNotificationMessage({
        type: 'error',
        message: 'Failed to export application data'
      });
    }
  };

  const handleClearApplicationCache = async () => {
    setIsLoading(true);
    
    try {
      // Missing endpoint - using mock clear for now
      localStorage.removeItem('app-cache');
      sessionStorage.clear();
      
      setNotificationMessage({
        type: 'success',
        message: 'Application cache cleared successfully'
      });
    } catch (error) {
      setNotificationMessage({
        type: 'error',
        message: 'Failed to clear application cache'
      });
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Settings</h1>
            <p className="text-gray-600">Configure your MeetMate AI preferences and integrations</p>
          </div>
          
          {/* Notification Toast */}
          {notificationMessage && (
            <div className={`mb-6 p-4 rounded-md ${
            notificationMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700" : 
            notificationMessage.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700"} 
              role="alert" 
              aria-live="polite"
            >
              {notificationMessage.message}
            </div>
          )}
          
          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-200 text-green-700">
              <div className="flex">
                <div className="flex-shrick-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zM9 9a1 1 0 000-2 2 0 002 2 2 0 000-4 4 0 000 8 8 0 000-16z" clipRule="evenodd"></path>
              </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{saveSuccess ? 'Settings saved successfully!' : ''}</p>
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                    {['calendar', 'agents', 'data', 'system'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600"
                  : 'border-transparent text-gray-500 hover:text-gray-700"
              >
                {tab === 'calendar' && 'Calendar Integrations'}
                {tab === 'agents' && 'Default Agent Settings'}
                {tab === 'data' && 'Data Management'}
                {tab === 'system' && 'System Preferences'}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'calendar' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Calendar Integrations</h2>
              
              {/* Google Calendar */}
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Google Calendar</h3>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-shrick-0">
                      <img className="h-8 w-8" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQi viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-900">Connected as {currentUser?.email}</p>
                    </div>
                    <button
                      onClick={() => setShowDisconnectConfirm('google')}>
                      Disconnect
                    </button>
                </div>
              </div>
              
              {/* Microsoft Outlook */}
              <div className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium text-gray-900">Microsoft Outlook</h3>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-shrick-0">
                      <img className="h-8 w-8" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQi viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-900">Not connected</p>
                    </div>
                    <button
                      onClick={() => handleConnectCalendar('microsoft')}>
                      Connect
                    </button>
                </div>
              </div>
              
              {/* Connect Calendar Form */}
              <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Add Calendar Account</h4>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleConnectCalendar('google')}>
                      Connect Google Calendar
                    </button>
                  <button
                    onClick={() => handleConnectCalendar('microsoft')}>
                      Connect Microsoft Outlook
                    </button>
                </div>
              </div>
            )}
            
            {activeTab === 'agents' && (
              <form onSubmit={handleUpdateDefaultAgentSettings}>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Default Agent Settings</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="meeting_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Type
                  </label>
                  <input
                    id="meeting_type"
                    type="text"
                    value={defaultAgentSettings.meeting_type}
                    onChange={(e) => {
                      setErrors(prev => ({ ...prev, meeting_type: '' }); // Clear error on change
                      setDefaultAgentSettings(prev => ({ ...prev, meeting_type: e.target.value })}}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., client_meeting, team_meeting'
                    />
                    {errors.meeting_type && (
                      <p className="text-red-600 text-xs mt-1">{errors.meeting_type}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="participation_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Participation Level
                  </label>
                  <select
                    id="participation_level"
                    value={defaultAgentSettings.participation_level}
                    onChange={(e) => {
                      setDefaultAgentSettings(prev => ({ ...prev, participation_level: e.target.value })}}
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="observer">Observer</option>
                      <option value="active_participant">Active Participant</option>
                      <option value="passive_observer">Passive Observer</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <label htmlFor="primary_objectives" className="block text-sm font-medium text-gray-700 mb-1">Primary Objectives</label>
                    <textarea
                      id="primary_objectives"
                      rows={3}
                      value={defaultAgentSettings.primary_objectives}
                    onChange={(e) => {
                      setErrors(prev => ({ ...prev, primary_objectives: '' }); // Clear error on change
                      setDefaultAgentSettings(prev => ({ ...prev, primary_objectives: e.target.value })})}}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the primary objectives for new agents..."
                    />
                  </div>
                  
                  <div className="col-span-2 mt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Saving...' : 'Save Default Settings'}
                    />
                  </div>
                </div>
              </form>
            )}
            
            {activeTab === 'data' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Data Retention Policies</h2>
              <form onSubmit={handleUpdateDataRetentionSettings}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="meeting_data_retention_days" className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Data (days)
                </label>
                <input
                  id="meeting_data_retention_days"
                  type="number"
                  min="1"
                  max="3650"
                  value={dataRetentionSettings.meeting_data_retention_days"}
                    onChange={(e) => {
                      setDataRetentionSettings(prev => ({ ...prev, meeting_data_retention_days: parseInt(e.target.value) })}}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="transcript_data_retention_days" className="block text-sm font-medium text-gray-700 mb-1">
                  Transcript Data (days)
                </label>
                <input
                  id="transcript_data_retention_days"}
                  type="number"
                  min="1"
                  max="3650"}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="90"
                />
              </div>
              
              <div>
                <label htmlFor="recording_data_retention_days" className="block text-sm font-medium text-gray-700 mb-1">
                  Recording Data (days)
                </label>
                <input
                  id="recording_data_retention_days"}
                type="number"
                min="1"
                max="3650"}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="col-span-3 mt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Retention Settings'}
                />
              </div>
            </form>
            
            {/* Data Management Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
              
              <div className="space-y-4">
                  <div>
                    <button
                      onClick={handleExportApplicationData}
                      disabled={isLoading}
                      className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isLoading ? 'Exporting...' : 'Export All Application Data'}
                  </button>
                  
                  <div>
                    <button
                      onClick={handleClearApplicationCache}
                      disabled={isLoading}
                      className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Clearing...' : 'Clear Application Cache'}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'system' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">System Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">Notification Settings</h3>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      className="absolute w-12 h-6 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable email notifications for meeting summaries and updates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                    <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200">
                    <input
                      type="checkbox"
                      className="absolute w-12 h-6 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal for Disconnect */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Disconnect Calendar?</h3>
          <p className="text-gray-600 mb-6">Are you sure you want to disconnect this calendar integration? You can reconnect it anytime.</p>
          </div>
          <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowDisconnectConfirm(null)}}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => handleDisconnectCalendar(showDisconnectConfirm)})}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default UV_AppSettings;