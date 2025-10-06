import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Meeting } from '@/store/main';

// Types for the component
interface MeetingHistoryFilters {
  date_range: {
    start: string;
    end: string;
  };
  agent_id: string | null;
  meeting_type: string | null;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
}

const UV_MeetingHistory: React.FC = () => {
  // CRITICAL: Individual selectors for Zustand store
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // URL parameters for filter persistence
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<MeetingHistoryFilters>({
    date_range: {
      start: searchParams.get('date_from') || '',
      end: searchParams.get('date_to') || ''
    },
    agent_id: searchParams.get('agent_id') || null,
    meeting_type: searchParams.get('meeting_type') || null
  });
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<'start_time' | 'title' | 'created_at'>('start_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('pdf');

  // Query client for cache management
  const queryClient = useQueryClient();

  // Available export formats
  const exportFormats: ExportFormat[] = [
    { id: 'pdf', name: 'PDF Document', extension: '.pdf' },
    { id: 'json', name: 'JSON Data', extension: '.json' },
    { id: 'csv', name: 'CSV Spreadsheet', extension: '.csv' },
    { id: 'text', name: 'Text Summary', extension: '.txt' }
  ];

  // Fetch meetings with filters
  const {
    data: meetingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['meetings', 'history', filters, searchQuery, currentPage, itemsPerPage, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        user_id: currentUser?.id || '',
        status: 'completed',
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });

      // Add filters
      if (filters.date_range.start) {
        params.append('start_date', filters.date_range.start);
      }
      if (filters.date_range.end) {
        params.append('end_date', filters.date_range.end);
      }
      if (filters.agent_id) {
        params.append('agent_id', filters.agent_id);
      }
      if (filters.meeting_type) {
        params.append('meeting_type', filters.meeting_type);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meetings`,
        {
          params,
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    },
    enabled: !!authToken && !!currentUser?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });

  // Fetch available agents for filter dropdown
  const { data: agentsData } = useQuery({
    queryKey: ['agents', 'filter'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents`,
        {
          params: {
            user_id: currentUser?.id,
            status: 'active',
            limit: 100
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    enabled: !!authToken && !!currentUser?.id
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (meetingIds: string[]) => {
      // Mock export implementation - in a real app, this would call a proper export endpoint
      const exportPromises = meetingIds.map(async (meetingId) => {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/meetings/${meetingId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      });

      const meetingsData = await Promise.all(exportPromises);
      
      // Simulate export processing
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            format: selectedExportFormat,
            count: meetingsData.length,
            data: meetingsData
          });
        }, 2000);
      });
    },
    onSuccess: (data) => {
      console.log('Export successful:', data);
      // In a real app, this would trigger a download
      alert(`Export completed! ${data.count} meetings exported as ${data.format.toUpperCase()}`);
      setShowExportModal(false);
      setSelectedMeetings([]);
    },
    onError: (error) => {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (filters.date_range.start) params.set('date_from', filters.date_range.start);
    if (filters.date_range.end) params.set('date_to', filters.date_range.end);
    if (filters.agent_id) params.set('agent_id', filters.agent_id);
    if (filters.meeting_type) params.set('meeting_type', filters.meeting_type);
    
    setSearchParams(params);
  }, [searchQuery, filters, setSearchParams]);

  // Handler for search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on new search
  }, []);

  // Handler for filter changes
  const handleFilterChange = useCallback((newFilters: Partial<MeetingHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  // Handler for meeting selection
  const handleMeetingSelect = (meetingId: string) => {
    setSelectedMeetings(prev =>
      prev.includes(meetingId)
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  // Handler for bulk selection
  const handleSelectAll = () => {
    if (selectedMeetings.length === (meetingsData?.meetings?.length || 0)) {
      setSelectedMeetings([]);
    } else {
      setSelectedMeetings(meetingsData?.meetings?.map((meeting: Meeting) => meeting.id) || []);
    }
  };

  // Handler for export
  const handleExport = () => {
    if (selectedMeetings.length === 0) {
      alert('Please select at least one meeting to export.');
      return;
    }
    setShowExportModal(true);
  };

  // Handler for export confirmation
  const handleExportConfirm = () => {
    exportMutation.mutate(selectedMeetings);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate duration
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMins = Math.round(durationMs / (1000 * 60));
    return `${durationMins} min`;
  };

  // Get meeting type color
  const getMeetingTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'team_meeting': 'bg-blue-100 text-blue-800',
      'client_meeting': 'bg-green-100 text-green-800',
      'one_on_one': 'bg-purple-100 text-purple-800',
      'brainstorming': 'bg-yellow-100 text-yellow-800',
      'planning': 'bg-indigo-100 text-indigo-800',
      'review': 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meeting History</h1>
              <p className="text-gray-600 mt-2">
                Review and export your past meetings with comprehensive search and filtering
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {selectedMeetings.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''} selected
                </div>
              )}
              <button
                onClick={handleExport}
                disabled={selectedMeetings.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Export Selected
              </button>
            </div>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Search Input */}
              <div className="lg:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Meetings
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by title, description, or content..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  id="date-from"
                  value={filters.date_range.start}
                  onChange={(e) => handleFilterChange({ date_range: { ...filters.date_range, start: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  id="date-to"
                  value={filters.date_range.end}
                  onChange={(e) => handleFilterChange({ date_range: { ...filters.date_range, end: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Agent Filter */}
              <div>
                <label htmlFor="agent" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Agent
                </label>
                <select
                  id="agent"
                  value={filters.agent_id || ''}
                  onChange={(e) => handleFilterChange({ agent_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Agents</option>
                  {agentsData?.agents?.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meeting Type Filter */}
              <div>
                <label htmlFor="meeting-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Type
                </label>
                <select
                  id="meeting-type"
                  value={filters.meeting_type || ''}
                  onChange={(e) => handleFilterChange({ meeting_type: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="team_meeting">Team Meeting</option>
                  <option value="client_meeting">Client Meeting</option>
                  <option value="one_on_one">1:1 Meeting</option>
                  <option value="brainstorming">Brainstorming</option>
                  <option value="planning">Planning</option>
                  <option value="review">Review</option>
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex space-x-2">
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="start_time">Meeting Date</option>
                    <option value="title">Title</option>
                    <option value="created_at">Created Date</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({
                    date_range: { start: '', end: '' },
                    agent_id: null,
                    meeting_type: null
                  });
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Bulk Actions Bar */}
          {selectedMeetings.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex justify-between items-center">
              <div className="text-blue-700 text-sm">
                {selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedMeetings([])}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleExport}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Export Selected
                </button>
              </div>
            </div>
          )}

          {/* Meeting List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedMeetings.length === (meetingsData?.meetings?.length || 0) && meetingsData?.meetings?.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meeting
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  // Loading state
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  // Error state
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="text-red-600">
                        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load meetings</h3>
                        <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
                        <button
                          onClick={() => refetch()}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : meetingsData?.meetings?.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchQuery || Object.values(filters).some(f => f !== null && f !== '') 
                          ? 'Try adjusting your search or filters.' 
                          : 'Get started by scheduling your first meeting.'
                        }
                      </p>
                      {!searchQuery && !Object.values(filters).some(f => f !== null && f !== '') && (
                        <div className="mt-6">
                          <Link
                            to="/meetings/setup"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Schedule Meeting
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  // Data rows
                  meetingsData?.meetings?.map((meeting: Meeting) => (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMeetings.includes(meeting.id)}
                          onChange={() => handleMeetingSelect(meeting.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{meeting.title}</div>
                            {meeting.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">{meeting.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(meeting.start_time)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calculateDuration(meeting.start_time, meeting.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMeetingTypeColor(meeting.meeting_type)}`}>
                          {meeting.meeting_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/meetings/${meeting.id}/review`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Review
                          </Link>
                          <button className="text-gray-600 hover:text-gray-900">
                            Export
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meetingsData?.total_count > itemsPerPage && (
            <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {((currentPage - 1) * itemsPerPage) + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, meetingsData?.total_count || 0)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{meetingsData?.total_count || 0}</span>{' '}
                    results
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage * itemsPerPage >= (meetingsData?.total_count || 0)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Meetings</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <div className="space-y-2">
                    {exportFormats.map((format) => (
                      <label key={format.id} className="flex items-center">
                        <input
                          type="radio"
                          name="export-format"
                          value={format.id}
                          checked={selectedExportFormat === format.id}
                          onChange={(e) => setSelectedExportFormat(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {format.name} ({format.extension})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Export Details</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''} selected</li>
                    <li>• Format: {exportFormats.find(f => f.id === selectedExportFormat)?.name}</li>
                    <li>• Includes: Meeting details, summary, and action items</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportConfirm}
                    disabled={exportMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </span>
                    ) : (
                      'Export Now'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_MeetingHistory;