import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Types based on Zod schemas
interface MeetingData {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  calendar_event_id: string | null;
  meeting_type: string;
  agenda: string | null;
  desired_outcomes: string | null;
  special_instructions: string | null;
  status: string;
}

interface AiAgent {
  id: string;
  name: string;
  meeting_type: string;
  status: string;
  participation_level: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string | null;
}

interface Participant {
  id: string;
  meeting_id: string;
  name: string;
  email: string | null;
  role: string | null;
}

const UV_MeetingSetup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const calendarIntegrations = useAppStore(state => state.calendar_integrations);
  const updateUserPreferences = useAppStore(state => state.update_user_preferences);
  const addNotification = useAppStore(state => state.add_notification);

  // Local state
  const [meetingData, setMeetingData] = useState<MeetingData>({
    id: '',
    user_id: currentUser?.id || '',
    title: '',
    description: null,
    start_time: '',
    end_time: '',
    calendar_event_id: null,
    meeting_type: '',
    agenda: null,
    desired_outcomes: null,
    special_instructions: null,
    status: 'scheduled'
  });
  const [availableAgents, setAvailableAgents] = useState<AiAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [participantList, setParticipantList] = useState<Participant[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantRole, setParticipantRole] = useState('participant');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Handle URL parameter for pre-population
  useEffect(() => {
    const calendarEventId = searchParams.get('calendar_event_id');
    if (calendarEventId) {
      setMeetingData(prev => ({
        ...prev,
        calendar_event_id: calendarEventId
    });
  }, [searchParams]);

  // Fetch available agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['available_agents', currentUser?.id],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents`,
          { 
            params: { 
              user_id: currentUser?.id,
              status: 'active'
          },
          {
            headers: { 
              Authorization: `Bearer ${authToken}` 
          }
        );
        return response.data;
      } catch (error) {
        throw new Error('Failed to fetch available agents');
      }
    },
    enabled: !!authToken && !!currentUser?.id,
  });

  // Fetch calendar events (mock implementation)
  useEffect(() => {
    // Mock calendar events data
    const mockEvents: CalendarEvent[] = [
      {
        id: 'cal_event_1',
        title: 'Team Standup',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        description: 'Daily team synchronization'
      },
      {
        id: 'cal_event_2',
        title: 'Client Review',
        start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
        description: 'Quarterly client performance review'
      }
    ];
    setCalendarEvents(mockEvents);
  }, [authToken, currentUser?.id]);

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: MeetingData) => {
      const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meetings`,
          meetingData,
          { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setIsLoading(false);
      setError(null);
      
      // Add success notification
      addNotification({
        type: 'success',
        title: 'Meeting Created',
        message: 'Your meeting has been successfully scheduled',
        timestamp: new Date().toISOString(),
        read: false,
        action: { type: 'navigate', path: `/meetings/${data.id}/active` }
      });
      
      // Navigate to active meeting
      navigate(`/meetings/${data.id}/active`);
    },
    onError: (error: any) => {
      setIsLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create meeting';
      
      setError(errorMessage);
    },
  });

  // Assign agent mutation
  const assignAgentMutation = useMutation({
    mutationFn: async ({ meetingId, agentId }: { meetingId: string, agentId: string }) => {
      const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meetings/${meetingId}/assign-agent`,
          { agent_id: agentId },
          { headers: { Authorization: `Bearer ${authToken}` }
      );
      return response.data;
    },
  });

  // Add participant mutation
  const addParticipantMutation = useMutation({
      mutationFn: async ({ meetingId, participant }: { meetingId: string, participant: Omit<Participant, 'id'>) => {
      const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meetings/${meetingId}/participants`,
          participant,
          { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Create the meeting
      const meetingResponse = await createMeetingMutation.mutateAsync(meetingData);
      
      // Assign agent if selected
      if (selectedAgentId) {
        await assignAgentMutation.mutateAsync({
          meetingId: meetingResponse.id,
          agentId: selectedAgentId
      });
      
      // Add participants
      if (participantList.length > 0) {
        await addParticipantMutation.mutateAsync({
            meetingId: meetingResponse.id,
            participant: {
              meeting_id: meetingResponse.id,
              name: participantName,
          email: participantEmail,
          role: participantRole
        });
      }
      
      // Add success notification
      addNotification({
        type: 'success',
        title: 'Meeting Created',
        message: 'Your meeting has been successfully scheduled with agent assignment',
            timestamp: new Date().toISOString(),
            read: false,
            action: { type: 'navigate', path: `/meetings/${meetingResponse.id}/active`,
        },
        timestamp: new Date().toISOString(),
        read: false,
        action: { type: 'navigate', path: `/meetings/${meetingResponse.id}/active` }
        });
        
      } catch (error) {
        console.error('Failed to assign agent or add participants');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create meeting';
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Handle calendar event selection
  const handleCalendarEventSelect = (event: CalendarEvent) => {
    setMeetingData(prev => ({
      ...prev,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time
    });
  };

  // Handle participant addition
  const handleAddParticipant = () => {
    if (!participantName.trim()) {
      setError('Participant name is required');
      return;
    }

    const newParticipant: Participant = {
      id: `part_${Date.now()}`,
      meeting_id: '',
      name: participantName,
      email: participantEmail || null,
      role: participantRole
    };

    setParticipantList(prev => [...prev, newParticipant];
    
    // Clear participant form
    setParticipantName('');
    setParticipantEmail('');
    setParticipantRole('participant');
  };

  // Handle drag and drop for agent assignment
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const agentId = e.dataTransfer.getData('text/plain');
    setSelectedAgentId(agentId);
  };

  const handleDragStart = (e: React.DragEvent, agentId: string) => {
    e.dataTransfer.setData('text/plain', agentId);
  };

  // Validate meeting times
  const validateMeetingTimes = () => {
    if (!meetingData.start_time || !meetingData.end_time) {
      return;
    }

    // Check for scheduling conflicts
    const hasConflict = false; // Mock implementation
    
    if (hasConflict) {
      setError('Scheduling conflict detected');
    } else {
      setError(null);
    }
  };

  useEffect(() => {
    validateMeetingTimes();
  }, [meetingData.start_time, meetingData.end_time]);

  // Calendar connection status
  const isCalendarConnected = calendarIntegrations.some(
      integration => integration.is_connected
    );
  }, [meetingData.start_time, meetingData.end_time]);

  // Handle meeting type change
  const handleMeetingTypeChange = (type: string) => {
    setMeetingData(prev => ({ ...prev, meeting_type: type }));

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Meeting Setup</h1>
                <div className="ml-4 flex items-center space-x-4">
                <Link 
                  to="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Main content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {/* Calendar Sync Status */}
            <div className="px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">Calendar Integration</h2>
              <div className="mt-2">
              {isCalendarConnected ? (
                <div className="flex items-center text-green-600">
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l8-8a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
                <span className="text-sm">Connected to calendar</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-600">
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path 
                    fillRule="evenodd" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
                <span className="text-sm">Calendar not connected</span>
              </div>
            )}
            </div>
            </div>
            
            {/* Calendar Events Selection */}
            <div className="px-6 py-4">
                <h3 className="text-md font-medium text-gray-900">Select Calendar Event</h3>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {calendarEvents.map(event => (
                  <div 
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.start_time).toLocaleDateString()} {new Date(event.start_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCalendarEventSelect(event)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Select
                    </button>
                </div>
              ))}
            </div>
            
            {/* Agent Assignment */}
            <div className="px-6 py-4">
              <h3 className="text-md font-medium text-gray-900">Assign AI Agent</h3>
              <div 
                className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedAgentId ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="font-medium text-gray-900">
                    Agent Assigned: {availableAgents.find(agent => agent.id === selectedAgentId)?.name || ''}
                  </p>
                  <button
                    onClick={() => setSelectedAgentId('')}
                    className="text-red-600 hover:text-red-500 text-sm font-medium"
                  >
                    Remove Agent
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">Drag an agent here to assign</p>
              </div>
              
              {/* Available Agents */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900">Available Agents</h4>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {agentsLoading ? (
                    <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              ) : (
                availableAgents.map(agent => (
                  <div
                    key={agent.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, agent.id)}
                    className="bg-white border border-gray-200 rounded-md p-4 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {agent.name} - {agent.meeting_type} - {agent.participation_level}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Meeting Details Form */}
            <div className="px-6 py-4">
              <h3 className="text-md font-medium text-gray-900">Meeting Details</h3>
                <div className="mt-4 space-y-4">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Meeting Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={meetingData.title}
                    onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, title: e.target.value }));
                }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={meetingData.description || ''}
                    onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, description: e.target.value }));
                }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  />
                </div>
                
                {/* Start and End Times */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    id="start_time"
                    type="datetime-local"
                    value={meetingData.start_time}
                    onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, start_time: e.target.value }));
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    id="end_time"
                    type="datetime-local"
                    value={meetingData.end_time}
                    onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, end_time: e.target.value }));
                }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              {/* Meeting Type */}
              <div>
                <label htmlFor="meeting_type" className="block text-sm font-medium text-gray-700">
                  </label>
                  <select
                    id="meeting_type"
                    value={meetingData.meeting_type}
                    onChange={(e) => handleMeetingTypeChange(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  >
                    <option value="">Select Meeting Type</option>
                    <option value="team_meeting">Team Meeting</option>
                    <option value="client_meeting">Client Meeting</option>
                    <option value="brainstorming">Brainstorming</option>
                    <option value="project_kickoff">Project Kickoff</option>
                    <option value="review">Review</option>
                    <option value="one_on_one">One-on-One</option>
                  </select>
                </div>
                
                {/* Agenda */}
                <div>
                  <label htmlFor="agenda" className="block text-sm font-medium text-gray-700">
                    Agenda (Optional)
                  </label>
                  <textarea
                    id="agenda"
                    rows={4}
                    value={meetingData.agenda || ''}
                    onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, agenda: e.target.value }));
                }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  />
                </div>
                
                {/* Desired Outcomes */}
                <div>
                  <label htmlFor="desired_outcomes" className="block text-sm font-medium text-gray-700">
                  Desired Outcomes (Optional)
                </label>
                <textarea
                  id="desired_outcomes"
                  rows={3}
                  value={meetingData.desired_outcomes || ''}
                  onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, desired_outcomes: e.target.value }));
                }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                />
              </div>
              
              {/* Special Instructions */}
              <div>
                <label htmlFor="special_instructions" className="block text-sm font-medium text-gray-700">
                  </label>
                  <textarea
                    id="special_instructions"
                    rows={3}
                    value={meetingData.special_instructions || ''}
                onChange={(e) => {
                  setError(null);
                  setMeetingData(prev => ({ ...prev, special_instructions: e.target.value }));
                }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Participant Management */}
            <div className="px-6 py-4">
              <h3 className="text-md font-medium text-gray-900">Participants</h3>
                <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {participantList.map(participant, index) => (
                  <div key={participant.id} className="bg-white border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                      <span className="text-sm text-gray-500">{participant.email} - {participant.role}</span>
                    </div>
                    <button
                      onClick={() => {
                        setParticipantList(prev => prev.filter((_, i) => i !== index)}"
                      className="text-red-600 hover:text-red-500 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Add Participant Form */}
              <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-900">Add Participant</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="participant_name" className="block text-sm font-medium text-gray-700">
                    Participant Name
                  </label>
                  <input
                    id="participant_name"
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="participant_email" className="block text-sm font-medium text-gray-700">
                    Email (Optional)
                  </label>
                  <input
                    id="participant_email"
                    type="email"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}"
                  />
                </div>
                
                <div>
                  <label htmlFor="participant_role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="participant_role"
                    value={participantRole}
                    onChange={(e) => setParticipantRole(e.target.value)}"
                  >
                    <option value="organizer">Organizer</option>
                    <option value="participant">Participant</option>
                    <option value="observer">Observer</option>
                  </select>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleAddParticipant}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Add Participant
                  </button>
                </div>
              </div>
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="px-6 py-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <p className="text-sm">{error}</p>
                </div>
            )}
            
            {/* Action Buttons */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <Link 
                  to="/dashboard"
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating Meeting...
                    </span>
                  ) : (
                    'Create Meeting'
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default UV_MeetingSetup;