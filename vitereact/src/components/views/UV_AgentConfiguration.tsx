import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from Zod schemas
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

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_type: string;
}

interface PerformanceMetrics {
  usage_count: number;
  avg_rating: number;
  last_used: string | null;
}

// API response types
interface AgentApiResponse {
  agents: AiAgent[];
  total_count: number;
}

interface MeetingsApiResponse {
  meetings: Meeting[];
  total_count: number;
}

const UV_AgentConfiguration: React.FC = () => {
  const { agent_id } = useParams<{ agent_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand store selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // State variables
  const [agent_details, setAgent_details] = useState<AiAgent>({
    id: '',
    user_id: '',
    name: '',
    meeting_type: '',
    status: 'active',
    participation_level: 'observer',
    primary_objectives: '',
    voice_settings: null,
    custom_instructions: null,
    speaking_triggers: null,
    note_taking_focus: null,
    follow_up_templates: null,
    last_used_at: null,
    created_at: '',
    updated_at: ''
  });
  const [original_config, setOriginal_config] = useState<AiAgent>({
    id: '',
    user_id: '',
    name: '',
    meeting_type: '',
    status: 'active',
    participation_level: 'observer',
    primary_objectives: '',
    voice_settings: null,
    custom_instructions: null,
    speaking_triggers: null,
    note_taking_focus: null,
    follow_up_templates: null,
    last_used_at: null
  });
  const [meeting_history, setMeeting_history] = useState<Meeting[]>([]);
  const [performance_metrics, setPerformance_metrics] = useState<PerformanceMetrics>({
    usage_count: 0,
    avg_rating: 0,
    last_used: null
  });
  const [is_modified, setIs_modified] = useState(false);
  const [active_tab, setActive_tab] = useState('basic');
  const [error_message, setError_message] = useState<string | null>(null);
  const [is_saving, setIs_saving] = useState(false);
  const [is_testing, setIs_testing] = useState(false);
  const [preview_text, setPreview_text] = useState('');

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Headers for authenticated requests
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`
  }), [authToken]);

  // Fetch agent details
  const { isLoading: isLoadingAgent, error: agentError } = useQuery({
    queryKey: ['agent', agent_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/agents/${agent_id}`, {
        headers: getHeaders()
      });
      return response.data;
    },
    enabled: !!agent_id && !!authToken,
    onSuccess: (data) => {
      setAgent_details(data);
      setOriginal_config(data);
    }
  });

  // Fetch meeting history for this agent
  const { isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['meeting-history', agent_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/meetings`, {
        headers: getHeaders(),
        params: {
          agent_id: agent_id,
          status: 'completed',
          sort_by: 'start_time',
          sort_order: 'desc'
      });
      return response.data;
    },
: error.message
    }
  });

  const fetchAgentMeetings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/meetings`, {
        headers: getHeaders(),
        params: {
          agent_id: agent_id,
          status: 'completed',
          sort_by: 'start_time',
          sort_order: 'desc',
        limit: 10
      },
        headers: getHeaders()
      });
      setMeeting_history(response.data.meetings);
    } catch (error: any) {
      console.error('Failed to fetch meeting history:', error);
      setError_message('Failed to load meeting history');
    }
  };

  // Update agent configuration mutation
  const updateAgentMutation = useMutation({
    mutationFn: async (updated_data: Partial<AiAgent>) => {
      const response = await axios.put(
        `${API_BASE_URL}/api/agents/${agent_id}`,
        updated_data,
        { headers: getHeaders() }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setAgent_details(data);
      setOriginal_config(data);
      setIs_modified(false);
      setIs_saving(false);
      
      // Update global agents state
      const currentAgents = useAppStore.getState().agents;
      const updatedAgents = currentAgents.map(agent =>
        agent.id === agent_id ? data : agent
      );
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (error: any) => {
      setIs_saving(false);
      setError_message('Failed to update agent configuration');
    }
  });

  // Handle field changes
  const handleFieldChange = (field: keyof AiAgent, value: any) => {
      setAgent_details(prev => ({
        ...prev,
        [field]: value
      }));
      setIs_modified(true);
      setError_message(null);
    }
  };

  // Save configuration
  const handleSave = async () => {
    if (!is_modified) return;
    
    setIs_saving(true);
    try {
      await updateAgentMutation.mutate(agent_details);
    } catch (error) {
      setIs_saving(false);
      setError_message('Failed to save changes');
    }
  };

  // Test configuration
  const handleTest = async () => {
    setIs_testing(true);
    // Simulate test (no API endpoint defined)
    setTimeout(() => {
      setIs_testing(false);
      setPreview_text('Configuration test successful! The agent would respond appropriately in meeting scenarios.');
    setIs_modified(false);
  };

  // Reset to original
  const handleReset = () => {
      setAgent_details(original_config);
      setIs_modified(false);
      setError_message(null);
    }
  };

  // Update preview when configuration changes
  useEffect(() => {
    const generatePreview = () => {
      const base = `This ${agent_details.name} agent is configured for ${agent_details.meeting_type} meetings. ';
      
      switch (agent_details.participation_level) {
        case 'observer':
          return 'The agent will quietly observe and take notes without participating in discussions.';
        case 'active_participant':
          return 'The agent will actively participate in discussions when triggered by specific phrases.';
        case 'passive_observer':
          return 'The agent will observe and may occasionally participate if directly addressed.';
        default:
          return 'Preview not available for current configuration.';
      }
    };

    setPreview_text(generatePreview());
  }, [agent_details]);

  if (isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (agentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Agent not found</h2>
        <p className="text-gray-600 mt-2">The requested agent configuration could not be loaded.</p>
        <Link 
          to="/agents"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Return to Agents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Agent Configuration</h1>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/agents"
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  ← Back to Agents
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Breadcrumb */}
            <nav className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <ol className="flex items-center space-x-2">
              <li>
                <Link 
                  to="/dashboard"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              <span>Dashboard</span>
              <span className="text-gray-500">/</span>
              <Link 
                to="/agents"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Agents
                </Link>
              </li>
              <li className="text-gray-500">/</span>
              <span className="text-gray-700">{agent_details.name}</span>
              <Link 
                to="/agents"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                Configuration
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Panel - Configuration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                {/* Tab Navigation */}
                <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActive_tab('basic')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                active_tab === 'basic' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActive_tab('behavior')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                active_tab === 'behavior'
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Meeting Behavior
              </button>
              <button
                onClick={() => setActive_tab('voice')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                active_tab === 'voice' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Voice Settings
              </button>
              <button
                onClick={() => setActive_tab('advanced')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                active_tab === 'advanced' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Advanced
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {active_tab === 'basic' && (
              <div className="space-y-4">
              {/* Agent Name */}
              <div>
                <label htmlFor="name" className="block:wblock text-sm font-medium text-gray-700">
                Agent Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={agent_details.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                  placeholder="Enter agent name"
                />
              </div>

              {/* Meeting Type */}
              <div>
                <label htmlFor="meeting_type" className="block text-sm font-medium text-gray-700">
                  Meeting Type
                </label>
                <select
                  id="meeting_type"
                  value={agent_details.meeting_type}
                  onChange={(e) => handleFieldChange('meeting_type', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select meeting type</option>
                  <option value="team_meeting">Team Meeting</option>
                  <option value="client_meeting">Client Meeting</option>
                  <option value="brainstorming">Brainstorming</option>
                  <option value="one_on_one">One-on-One</option>
                  <option value="project_kickoff">Project Kickoff</option>
                  <option value="quarterly_review">Quarterly Review</option>
                  <option value="status_update">Status Update</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    value={agent_details.status}
                  onChange={(e) => handleFieldChange('status', e.target.value as 'active' | 'inactive' | 'paused']}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            )}

            {active_tab === 'behavior' && (
              <div className="space-y-4">
              {/* Participation Level */}
              <div>
                <label htmlFor="participation_level" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                  </div>
                </div>
              </div>

              {active_tab === 'voice' && (
                <div className="space-y-4">
                <div>
                  <label htmlFor="participation_level" className="block text-sm font-medium text-gray-700">
                    Participation Level
                  </label>
                  <select
                    id="participation_level"
                    value={agent_details.participation_level}
                    onChange={(e) => handleFieldChange('participation_level', e.target.value as 'observer' | 'active_participant' | 'passive_observer']}>
                    <option value="observer">Observer</option>
                    <option value="active_participant">Active Participant</option>
                    <option value="passive_observer">Passive Observer</option>
                  </select>
                </div>

                {/* Primary Objectives */}
                <div>
                  <label htmlFor="primary_objectives" className="block text-sm font-medium text-gray-700">
                      Passive Observer
                    </label>
                  </div>
                </div>
              </div>
            )}

            {active_tab === 'advanced' && (
              <div className="space-y-4">
                {/* Custom Instructions */}
                <div>
                  <label htmlFor="custom_instructions" className="block text-sm font-medium text-gray-700">
                      Primary Objectives
                    </label>
                    <textarea
                      id="custom_instructions"
                      rows={4}
                      value={agent_details.custom_instructions || ''}
                  onChange={(e) => handleFieldChange('custom_instructions', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                      placeholder="Enter custom instructions for the agent..."
                    />
                  </div>

                  {/* Speaking Triggers */}
                  <div>
                    <label htmlFor="speaking_triggers" className="block text-sm font-medium text-gray-700">
                        Speaking Triggers
                      </label>
                      <textarea
                        id="speaking_triggers"
                        rows={3}
                        value={agent_details.speaking_triggers || ''}
                    onChange={(e) => handleFieldChange('speaking_triggers', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                        placeholder="Enter phrases that trigger agent participation..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error_message && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                          Error
                        </h3>
                        <p className="text-sm text-red-700">{error_message}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={is_testing}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 border-gray-300 rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {is_testing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Testing...
                        </span>
                      ) : (
                        'Test Configuration'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!is_modified || is_saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {is_saving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={!is_modified}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 border-gray-300 rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900">Configuration Preview</h3>
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">{preview_text}</p>
            </div>

            {/* Meeting History */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700">
                    Meeting History
                  </h4>
                  <div className="mt-2 space-y-3">
                {meeting_history.length > 0 ? (
                  meeting_history.slice(0, 5).map((meeting) => (
                <div key={meeting.id} className="border-b border-gray-200 pb-3">
                <p className="text-sm text-gray-900">{meeting.title}</p>
                  <p className="text-sm text-gray-500">
                      {new Date(meeting.start_time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AgentConfiguration;