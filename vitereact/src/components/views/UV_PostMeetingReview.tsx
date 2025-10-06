import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { MeetingSummary, ActionItem, MeetingRecording } from '@/schema.ts';

// Interfaces for local state
interface EditedContent {
  summary: string;
  actions: Array<{
    id: string;
    description: string;
    assignee: string;
    deadline: string;
    status: string;
  }>;
}

// Define payload interfaces for API calls
interface UpdateMeetingSummaryPayload {
  key_discussion_points: string;
  edited_summary: string;
  is_finalized: boolean;
}

interface UpdateActionItemPayload {
  description: string;
  assignee: string;
  deadline: string;
  status: string;
  comments?: string | null;
}

interface FollowUpEmailPayload {
  meeting_id: string;
  recipients: string;
  subject: string;
  body: string;
  status: string;
}

const UV_PostMeetingReview: React.FC = () => {
  const { meeting_id } = useParams<{ meeting_id: string }>();
  const queryClient = useQueryClient();
  
  // Global state access - CRITICAL: Individual selectors
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const current_user = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [meeting_summary, setMeetingSummary] = useState<MeetingSummary>({
    id: '',
    meeting_id: '',
    key_discussion_points: '',
    decisions_made: null,
    sentiment_analysis: null,
    participant_engagement: null,
    generated_summary: '',
    edited_summary: null,
    generated_at: '',
    edited_at: null,
    is_finalized: false,
    created_at: '',
    updated_at: ''
  });
  const [extracted_action_items, setExtractedActionItems] = useState<ActionItem[]>([]);
  const [meeting_recording, setMeetingRecording] = useState<MeetingRecording>({
    id: '',
    meeting_id: '',
    recording_url: null,
    storage_duration: 0,
    file_size: null,
    created_at: ''
  });
  const [participant_engagement, setParticipantEngagement] = useState<object>({});
  const [edited_content, setEditedContent] = useState<EditedContent>({
    summary: '',
    actions: []
  });
  const [active_tab, setActiveTab] = useState<'summary' | 'action_items' | 'analytics' | 'export'>('summary');
  const [is_editing, setIsEditing] = useState(false);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is_finalized, setIsFinalized] = useState(false);
  
  // API base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
  
  // Headers configuration for authenticated requests
  const getHeaders = () => ({
    headers: {
      'Authorization': `Bearer ${auth_token}`,
    'Content-Type': 'application/json'
  });

  // Fetch meeting review data
  const { data: reviewData, isLoading: isLoadingReview } = useQuery({
    queryKey: ['meeting_review', meeting_id],
    queryFn: async () => {
      if (!meeting_id) throw new Error('Meeting ID is required');
      
      try {
        // Fetch meeting summary
        const summaryResponse = await axios.get(
          `${apiBaseUrl}/meeting-summaries?meeting_id=${meeting_id}`,
          getHeaders()
        );
        
        // Fetch action items
        const actionItemsResponse = await axios.get(
          `${apiBaseUrl}/action-items?meeting_id=${meeting_id}`,
          getHeaders()
        );
        
        // Fetch meeting recording
        const recordingResponse = await axios.get(
          `${apiBaseUrl}/meetings/${meeting_id}/recording`,
          getHeaders()
        );
        
        return {
          meeting_summary: summaryResponse.data.summaries?.[0] || meeting_summary,
          extracted_action_items: actionItemsResponse.data.action_items || [],
          meeting_recording: recordingResponse.data || meeting_recording,
          participant_engagement: summaryResponse.data.summaries?.[0]?.participant_engagement || {}
        };
      } catch (error) {
        console.error('Error fetching meeting review data:', error);
        throw new Error('Failed to load meeting review data');
      }
    },
    enabled: !!meeting_id && !!auth_token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Update meeting summary mutation
  const updateMeetingSummaryMutation = useMutation({
    mutationFn: async (updatedSummary: UpdateMeetingSummaryPayload) => {
      const response = await axios.put(
        `${apiBaseUrl}/meeting-summaries/${reviewData?.meeting_summary.id || ''}`,
          { ...updatedSummary },
          getHeaders()
        );
        return response.data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting_review', meeting_id] })
  });

  // Update action item mutation
  const updateActionItemMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & UpdateActionItemPayload) => {
      const response = await axios.put(
        `${apiBaseUrl}/action-items/${id}`,
          payload,
          getHeaders()
        );
        return response.data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting_review', meeting_id] })
        );
        return response.data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting_review', meeting_id] })
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to update action item');
    }
  });

  // Send follow-up email mutation
  const sendFollowUpEmailMutation = useMutation({
    mutationFn: async (payload: FollowUpEmailPayload) => {
      const response = await axios.post(
        `${apiBaseUrl}/follow-up-emails`,
          payload,
          getHeaders()
        );
        return response.data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting_review', meeting_id] })
        );
        return response.data;
      },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to send follow-up email');
    }
  });

  // Load data when component mounts or slug changes
  useEffect(() => {
    if (reviewData) {
      setMeetingSummary(reviewData.meeting_summary);
      setExtractedActionItems(reviewData.extracted_action_items);
      setMeetingRecording(reviewData.meeting_recording);
      setEditedContent({
        summary: reviewData.meeting_summary.generated_summary,
      setExtractedActionItems(reviewData.extracted_action_items);
    }
  }, [reviewData]);

  // Handle editing the summary
  const handleSummaryEdit = (newContent: string) => {
    setEditedContent(prev => ({
      ...prev,
      summary: newContent
      });
    };

  // Handle action item edit
  const handleActionItemEdit = (actionItemId: string, field: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      actions: prev.actions.map(item =>
        item.id === actionItemId ? { ...item, [field]: value } : item
      });
    };

  // Save meeting summary
  const handleSaveSummary = async () => {
    try {
      setError(null);
      await updateMeetingSummaryMutation.mutateAsync({
      key_discussion_points: edited_content.summary,
      edited_summary: edited_content.summary,
      is_finalized: is_finalized
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving meeting summary:', error);
    }
  };

  // Save action item
  const handleSaveActionItem = async (actionItemId: string) => {
    try {
      setError(null);
      const actionItem = edited_content.actions.find(item => item.id === actionItemId);
      if (actionItem) {
        await updateActionItemMutation.mutateAsync({
        id: actionItemId,
        ...actionItem
      });
    } catch (error) {
      console.error('Error saving action item:', error);
    }
  };

  // Send follow-up email
  const handleSendFollowUpEmail = async () => {
    try {
      setError(null);
      
      // TODO: Extract recipients from participant data
      const recipients = 'TODO: Extract from participant data';
      
      await sendFollowUpEmailMutation.mutateAsync({
        meeting_id: meeting_id || '',
        recipients,
        subject: `Meeting Summary: ${meeting_summary.title || 'Untitled'}`,
        body: edited_content.summary,
        status: 'scheduled'
      });
    } catch (error) {
      console.error('Error sending follow-up email:', error);
    }
  };

  // Finalize meeting review
  const handleFinalize = async () => {
    try {
      setError(null);
      await updateMeetingSummaryMutation.mutateAsync({
        key_discussion_points: edited_content.summary,
        edited_summary: edited_content.summary,
        is_finalized: true
      });
      
      setIsFinalized(true);
    } catch (error) {
      console.error('Error finalizing meeting review:', error);
    }
  };

  // Export meeting data
  const handleExport = (format: 'pdf' | 'text' | 'email' }) => {
    try {
      setError(null);
      
      switch (format) {
        case 'pdf':
          // Generate PDF export
          break;
        case 'text':
          // Generate text export
          break;
        case 'email':
          await handleSendFollowUpEmail();
      break;
    }
  } catch (error) {
    console.error('Error exporting meeting data:', error);
    }
  };

  if (isLoadingReview) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <div className="text-center text-gray-600">
                Loading meeting review data...
              </div>
            </div>
          </div>
        </>
      );
    }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                Post-Meeting Review
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Link to="/meetings/history" className="text-blue-600 hover:text-blue-500 transition-colors">
                    Back to Meeting History
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {['summary', 'action_items', 'analytics', 'export'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${active_tab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"}`}
                >
                  {tab === 'summary' && 'Meeting Summary'}
                  {tab === 'action_items' && 'Action Items'}
                  {tab === 'analytics' && 'Analytics'}
                  {tab === 'export' && 'Export'}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="mt-6">
            {active_tab === 'summary' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Meeting Summary
                </h2>
                <div className="prose max-w-none">
                {is_editing ? (
                  <textarea
                    value={edited_content.summary}
                    onChange={(e) => {
                      setError(null);
                      setEditedContent(prev => ({ ...prev, summary: e.target.value }) }}
                  className="w-full h-64 p-4 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="whitespace-pre-wrap">
                    {edited_content.summary || meeting_summary.generated_summary}
                  </div>
                )}
                
                <div className="mt-4 flex space-x-3">
                  {!is_editing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:text-gray-800 transition-colors"
                >
                  Edit Summary
                </button>
                  )}
                  
                  {is_editing && (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveSummary}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"}`}
                      disabled={updateMeetingSummaryMutation.isPending)}
                    >
                      {updateMeetingSummaryMutation.isPending ? 'Saving...' : 'Save Summary'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {active_tab === 'action_items' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
            </div>
            <div className="space-y-4">
              {extracted_action_items.map((actionItem) => {
            const editedAction = edited_content.actions.find(item => item.id === actionItem.id) || actionItem}>
            
            <div className="border border-gray-200 rounded-md p-4">
              <div className="grid grid-cols-12 gap-4 mb-3">
                <div className="col-span-8">
                  <input
                    type="text"
                    value={editedAction?.description || actionItem.description}
                    onChange={(e) => handleActionItemEdit(actionItem.id, 'description', e.target.value) }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={editedAction?.assignee || actionItem.assignee}
                    onChange={(e) => handleActionItemEdit(actionItem.id, 'assignee', e.target.value) }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="date"
                    value={editedAction?.deadline || actionItem.deadline}
                    onChange={(e) => handleActionItemEdit(actionItem.id, 'deadline', e.target.value) }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={editedAction?.status || actionItem.status}
                    onChange={(e) => handleActionItemEdit(actionItem.id, 'status', e.target.value) }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => handleActionItemEdit(actionItem.id, 'status', e.target.value) }}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSaveActionItem(actionItem.id)}}
                    disabled={updateActionItemMutation.isPending)}
                  >
                    Save
                  </button>
                </div>
              </div>
            })}
            </div>
          )}
          
          {active_tab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Meeting Analytics</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-md font-medium text-blue-800">Participant Engagement</h3>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-md font-medium text-green-800">Sentiment Analysis</h3>
              <p className="text-blue-700 text-sm">
                  {meeting_summary.participant_engagement || 'No engagement data available'}
            </p>
          </div>
        </div>
      )}
      
      {active_tab === 'export' && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={() => handleExport('pdf')}}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Export as PDF
        </button>
        <button
          onClick={() => handleExport('text')}}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Export as Text
        </button>
        <button
          onClick={() => handleExport('email')}}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Send as Email
        </button>
      </div>
    )}
    
    {/* Error Display */}
    {error && (
      <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="mt-6 flex space-x-3">
        <button
          onClick={handleFinalize}
          disabled={is_finalized || updateMeetingSummaryMutation.isPending)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {is_finalized ? 'Finalized' : 'Finalize Review'}
        </button>
        <button
          onClick={() => setActiveTab('summary')}}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
        >
          Back to Meetings
        </button>
      </div>
    </div>
  </>
);
};

export default UV_PostMeetingReview;