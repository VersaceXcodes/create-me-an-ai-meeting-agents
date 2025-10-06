import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { io, Socket } from 'socket.io-client';

// Types based on Zod schemas
interface Meeting {
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
  created_at: string;
  updated_at: string;
}

interface MeetingAgent {
  id: string;
  meeting_id: string;
  agent_id: string;
  join_status: string;
  joined_at: string | null;
  left_at: string | null;
}

interface MeetingTranscript {
  id: string;
  meeting_id: string;
  speaker: string | null;
  content: string;
  timestamp: string;
  created_at: string;
}

interface ActionItem {
  id: string;
  meeting_id: string;
  description: string;
  assignee: string;
  deadline: string;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentControlState {
  isMuted: boolean;
  participationLevel: number; // 0-100 scale
  customPrompt: string;
}

const UV_ActiveMeeting: React.FC = () => {
  const { meeting_id } = useParams<{ meeting_id: string }>();
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const queryClient = useQueryClient();

  // State variables
  const [meetingDetails, setMeetingDetails] = useState<Meeting>({
    id: '',
    user_id: '',
    title: '',
    description: null,
    start_time: '',
    end_time: '',
    calendar_event_id: null,
    meeting_type: '',
    agenda: null,
    desired_outcomes: null,
    special_instructions: null,
    status: 'scheduled',
    created_at: '',
    updated_at: ''
  });
  const [liveTranscript, setLiveTranscript] = useState<MeetingTranscript[]>([]);
  const [agentStatus, setAgentStatus] = useState<MeetingAgent>({
    id: '',
    meeting_id: '',
    agent_id: '',
    join_status: 'pending',
    joined_at: null,
    left_at: null
  });
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const [detectedActionItems, setDetectedActionItems] = useState<ActionItem[]>([]);
  const [agentControl, setAgentControl] = useState<AgentControlState>({
    isMuted: false,
    participationLevel: 50,
    customPrompt: ''
  });
  const [showEmergencyStop, setShowEmergencyStop] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [speakingTimeData, setSpeakingTimeData] = useState<{[key: string]: number}>({});
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false);

  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Fetch meeting details
  const { data: meetingData, isLoading: meetingLoading, error: meetingError } = useQuery({
    queryKey: ['meeting', meeting_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/meetings/${meeting_id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!meeting_id && !!authToken,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch agent status
  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ['meeting-agent', meeting_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/meetings/${meeting_id}/agents`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!meeting_id && !!authToken,
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Control agent mutation
  const controlAgentMutation = useMutation({
    mutationFn: async (data: { join_status: string; left_at?: string }) => {
      const response = await axios.put(
        `${API_BASE_URL}/api/meeting-agents/${agentStatus.id}`,
        data,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setAgentStatus(data);
      queryClient.invalidateQueries({ queryKey: ['meeting-agent', meeting_id] });
    }
  });

  // Create action item mutation
  const createActionItemMutation = useMutation({
    mutationFn: async (actionItem: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/action-items`,
        actionItem,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setDetectedActionItems(prev => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
    }
  });

  // Initialize meeting state from API data
  useEffect(() => {
    if (meetingData) {
      setMeetingDetails(meetingData);
    }
  }, [meetingData]);

  useEffect(() => {
    if (agentData) {
      setAgentStatus(agentData);
    }
  }, [agentData]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!meeting_id || !authToken) return;

    const socket = io(API_BASE_URL, {
      auth: {
        token: authToken
      }
    });

    socketRef.current = socket;

    socket.emit('join_meeting', { meeting_id });

    socket.on('connect', () => {
      setWebsocketConnected(true);
      console.log('Connected to meeting WebSocket');
    });

    socket.on('disconnect', () => {
      setWebsocketConnected(false);
      console.log('Disconnected from meeting WebSocket');
    });

    socket.on('live_transcript_update', (data) => {
      setLiveTranscript(prev => [...prev, data.transcript_chunk]);
      setCurrentSpeaker(data.current_speaker || '');
      
      // Update speaking time data
      if (data.current_speaker) {
        setSpeakingTimeData(prev => ({
          ...prev,
          [data.current_speaker]: (prev[data.current_speaker] || 0) + 1
        }));
      }
    });

    socket.on('action_item_detected', (data) => {
      setDetectedActionItems(prev => [...prev, data.action_item]);
    });

    socket.on('agent_join_status_changed', (data) => {
      setAgentStatus(data.meeting_agent);
    });

    socket.on('meeting_status_changed', (data) => {
      setMeetingDetails(data.meeting);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.emit('leave_meeting', { meeting_id });
      socket.disconnect();
    };
  }, [meeting_id, authToken]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  // Timer for meeting duration
  useEffect(() => {
    if (!meetingDetails.start_time || meetingDetails.status !== 'in_progress') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(meetingDetails.start_time).getTime();
      const endTime = new Date(meetingDetails.end_time).getTime();
      
      setElapsedTime(Math.floor((now - startTime) / 1000));
      setRemainingTime(Math.max(0, Math.floor((endTime - now) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [meetingDetails.start_time, meetingDetails.end_time, meetingDetails.status]);

  // Control agent functions
  const handleToggleMute = useCallback(async () => {
    const newMuteState = !agentControl.isMuted;
    setAgentControl(prev => ({ ...prev, isMuted: newMuteState }));
    
    // Send command to agent
    if (socketRef.current) {
      socketRef.current.emit('agent_control', {
        meeting_id,
        agent_id: agentStatus.agent_id,
        action: newMuteState ? 'mute' : 'unmute',
        params: {}
      });
    }
  }, [agentControl.isMuted, meeting_id, agentStatus.agent_id]);

  const handleParticipationLevelChange = useCallback((level: number) => {
    setAgentControl(prev => ({ ...prev, participationLevel: level }));
    
    if (socketRef.current) {
      socketRef.current.emit('agent_control', {
        meeting_id,
        agent_id: agentStatus.agent_id,
        action: 'set_participation_level',
        params: { participation_level: level }
      });
    }
  }, [meeting_id, agentStatus.agent_id]);

  const handleCustomPrompt = useCallback(() => {
    if (!agentControl.customPrompt.trim()) return;

    if (socketRef.current) {
      socketRef.current.emit('agent_control', {
        meeting_id,
        agent_id: agentStatus.agent_id,
        action: 'send_custom_prompt',
        params: { prompt: agentControl.customPrompt }
      });
    }

    setAgentControl(prev => ({ ...prev, customPrompt: '' }));
  }, [agentControl.customPrompt, meeting_id, agentStatus.agent_id]);

  const handleEmergencyStop = useCallback(async () => {
    try {
      await controlAgentMutation.mutateAsync({
        join_status: 'left',
        left_at: new Date().toISOString()
      });
      setShowEmergencyStop(false);
    } catch (error) {
      console.error('Failed to emergency stop agent:', error);
    }
  }, [controlAgentMutation]);

  const handleCreateActionItem = useCallback((description: string) => {
    createActionItemMutation.mutate({
      meeting_id: meeting_id!,
      description,
      assignee: 'Unassigned',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'pending',
      comments: null
    });
  }, [meeting_id, createActionItemMutation]);

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get speaker color for transcript
  const getSpeakerColor = (speaker: string | null) => {
    if (!speaker) return 'text-gray-600';
    
    const speakers = Array.from(new Set(liveTranscript.map(t => t.speaker).filter(Boolean)));
    const speakerIndex = speakers.indexOf(speaker);
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
    return colors[speakerIndex % colors.length] || 'text-gray-600';
  };

  if (meetingLoading || agentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (meetingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Meeting Not Found</h2>
          <p className="text-gray-600 mb-4">The meeting you're looking for doesn't exist or you don't have permission to access it.</p>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-500">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  to="/dashboard" 
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{meetingDetails.title}</h1>
                  <p className="text-sm text-gray-500">
                    {meetingDetails.meeting_type} • {new Date(meetingDetails.start_time).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                {/* Time Display */}
                <div className="text-center">
                  <div className="text-sm text-gray-500">Elapsed</div>
                  <div className="text-lg font-semibold text-gray-900">{formatTime(elapsedTime)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Remaining</div>
                  <div className="text-lg font-semibold text-gray-900">{formatTime(remainingTime)}</div>
                </div>
                
                {/* WebSocket Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${websocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-500">
                    {websocketConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Transcript and Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Transcription Panel */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Live Transcription</h2>
                  <p className="text-sm text-gray-500">Real-time conversation with speaker identification</p>
                </div>
                
                <div 
                  ref={transcriptContainerRef}
                  className="h-96 overflow-y-auto p-6 space-y-4"
                >
                  {liveTranscript.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p className="mt-2">Waiting for conversation to start...</p>
                    </div>
                  ) : (
                    liveTranscript.map((transcript, index) => (
                      <div key={transcript.id || index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-start space-x-3">
                          {transcript.speaker && (
                            <span className={`font-medium ${getSpeakerColor(transcript.speaker)}`}>
                              {transcript.speaker}:
                            </span>
                          )}
                          <p className="text-gray-700 flex-1">{transcript.content}</p>
                          <span className="text-xs text-gray-400">
                            {new Date(transcript.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Agent Control Panel */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Agent Controls</h2>
                  <p className="text-sm text-gray-500">Manage your AI assistant during the meeting</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Mute/Unmute Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Agent Audio</label>
                      <p className="text-sm text-gray-500">Enable or disable agent voice</p>
                    </div>
                    <button
                      onClick={handleToggleMute}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        agentControl.isMuted ? 'bg-gray-200' : 'bg-blue-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          agentControl.isMuted ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Participation Level Slider */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Participation Level: {agentControl.participationLevel}%
                    </label>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">Observer</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={agentControl.participationLevel}
                        onChange={(e) => handleParticipationLevelChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm text-gray-500">Active</span>
                    </div>
                  </div>

                  {/* Custom Prompt Input */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Custom Prompt
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={agentControl.customPrompt}
                        onChange={(e) => setAgentControl(prev => ({ ...prev, customPrompt: e.target.value }))}
                        placeholder="Ask the agent to say something specific..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={handleCustomPrompt}
                        disabled={!agentControl.customPrompt.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Emergency Stop */}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setShowEmergencyStop(true)}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      Emergency Stop Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Agent Status */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Agent Status</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${
                      agentStatus.join_status === 'joined' ? 'bg-green-500' : 
                      agentStatus.join_status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {agentStatus.join_status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {agentStatus.joined_at && (
                    <div className="text-sm text-gray-500">
                      Joined: {new Date(agentStatus.joined_at).toLocaleTimeString()}
                    </div>
                  )}
                  
                  {agentStatus.join_status === 'joined' && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        Agent is actively participating in the meeting
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
                  <p className="text-sm text-gray-500">Detected during conversation</p>
                </div>
                
                <div className="p-4 max-h-64 overflow-y-auto">
                  {detectedActionItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      <p>No action items detected yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectedActionItems.map((item, index) => (
                        <div key={item.id || index} className="border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-800 mb-2">{item.description}</p>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Assignee: {item.assignee}</span>
                            <span className="capitalize">{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const description = prompt('Enter action item description:');
                      if (description) {
                        handleCreateActionItem(description);
                      }
                    }}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    + Add Action Item
                  </button>
                </div>
              </div>

              {/* Speaking Time Analysis */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Speaking Time</h2>
                  <p className="text-sm text-gray-500">Participation distribution</p>
                </div>
                
                <div className="p-6">
                  {Object.keys(speakingTimeData).length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      <p>No speaking data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(speakingTimeData)
                        .sort(([,a], [,b]) => b - a)
                        .map(([speaker, time]) => (
                          <div key={speaker} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{speaker}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ 
                                    width: `${(time / Math.max(...Object.values(speakingTimeData))) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 w-12 text-right">
                                {time}s
                              </span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Meeting Progress */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Meeting Progress</h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Agenda Completion</span>
                        <span>65%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Topics Covered</span>
                        <span>3/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Action Items Identified</span>
                        <span>{detectedActionItems.length}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, detectedActionItems.length * 20)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Stop Confirmation Modal */}
        {showEmergencyStop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Emergency Stop</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to immediately remove the AI agent from this meeting? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEmergencyStop(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmergencyStop}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Stop Agent
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_ActiveMeeting;