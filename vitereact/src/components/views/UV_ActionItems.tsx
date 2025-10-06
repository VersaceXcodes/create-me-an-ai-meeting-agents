import React, { useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Define TypeScript interfaces based on the Zod schemas
interface ActionItem {
  id: string;
  meeting_id: string;
  description: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  comments: string | null;
  created_at: string;
  updated_at: string;
}

interface SearchActionItemsInput {
  user_id?: string;
  status?: string;
  assignee?: string | null;
  deadline_after?: string;
  deadline_before?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}

interface KanbanColumns {
  pending: string[];
  in_progress: string[];
  completed: string[];
}

const UV_ActionItems: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual Zustand selectors, no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  // State variables from datamap
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    assignee: null as string | null,
    deadline_range: { start: '', end: '' },
    priority: null as string | null,
  });
  
  // Extract status filter from URL params
  const statusFilter = searchParams.get('status');
  
  // API endpoint for fetching action items
  const fetchActionItems = async (): Promise<{ action_items: ActionItem[], kanban_columns: KanbanColumns }> => {
    const queryParams: Record<string, string | undefined> = {
      user_id: currentUser?.id,
      status: statusFilter || undefined,
      assignee: filters.assignee || undefined,
      deadline_after: filters.deadline_range.start || undefined,
      deadline_before: filters.deadline_range.end || undefined,
    };
    
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/action-items`,
      {
        params: {
          ...queryParams,
          limit: 100
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      );
      
      const items = response.data.action_items;
      
      return {
        action_items: items,
        kanban_columns: {
          pending: items.filter(item => item.status === 'pending').map(item => item.id),
          in_progress: items.filter(item => item.status === 'in_progress').map(item => item.id),
          completed: items.filter(item => item.status === 'completed').map(item => item.id)
        }
      };
    };
    
    // Fetch action items with React Query
    const { data, isLoading, error } = useQuery({
      queryKey: ['action-items', filters, statusFilter] as const,
      queryFn: fetchActionItems,
      enabled: !!currentUser?.id && !!authToken,
      staleTime: 60000,
      refetchOnWindowFocus: false,
    });
    
    // Update action item status mutation
    const updateActionItemStatusMutation = useMutation({
      mutationFn: async ({ id, status }: { id: string, status: string }) => {
        return axios.put(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/action-items/${id}`,
          { status },
          { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
    },
    });
    
    // Bulk update action items mutation
    const bulkUpdateActionItemsMutation = useMutation({
      mutationFn: async (updates: { ids: string[], status: string }) => {
        const requests = updates.ids.map(id =>
          axios.put(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/action-items`,
          { action_items: updates } // This would need bulk endpoint
      });
      
      return Promise.all(requests).then(responses => responses.map(response => response.data)),
      });
      
      // Handler functions
      const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
      setFilters(prev => ({ ...prev, ...newFilters })),
    }, []);
    
    const handleStatusUpdate = useCallback((actionItemId: string, newStatus: string) => {
      updateActionItemStatusMutation.mutate({ id: actionItemId, status: newStatus });
    }, [updateActionItemStatusMutation]);
    
    const handleBulkUpdate = useCallback((newStatus: string) => {
      if (selectedItems.length === 0) return;
      
      // For now, update individually - backend should implement bulk endpoint
      selectedItems.forEach(id => {
        updateActionItemStatusMutation.mutate({ id, status: newStatus });
    }, [selectedItems, updateActionItemStatusMutation]);
    
    const handleItemSelect = useCallback((id: string, selected: boolean) => {
      if (selected) {
        setSelectedItems(prev => [...prev, id]);
      } else {
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }, [selectedItems]);
    
    const clearFilters = useCallback(() => {
      setFilters({
        assignee: null,
        deadline_range: { start: '', end: '' },
        priority: null,
      });
    }, []);
    
    // Memoized data for rendering
    const actionItems = data?.action_items || [];
    const kanbanColumns = data?.kanban_columns || { pending: [], in_progress: [], completed: [] };
    
    // Calculate progress metrics
    const progressMetrics = useMemo(() => {
      const total = actionItems.length;
      const completed = actionItems.filter(item => item.status === 'completed').length;
      const inProgress = actionItems.filter(item => item.status === 'in_progress').length;
      const pending = actionItems.filter(item => item.status === 'pending').length;
      
      return {
        total,
        completed,
        inProgress,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0;
    }, [actionItems]);
    
    return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Action Items</h1>
                <div className="flex items-center space-x-4">
                <Link 
                  to="/dashboard"
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                  ← Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Filters Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Assignee Filter */}
            <div>
              <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Assignee
            </label>
            <input
              id="assignee-filter"
              type="text"
              value={filters.assignee || ''}
              onChange={(e) => {
                setFilters(prev => ({ 
                  ...prev, 
                  assignee: e.target.value || null 
                });
              }}
              placeholder="Search assignee..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          {/* Deadline Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline Range
            </label>
            <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.deadline_range.start}
            onChange={(e) => {
              setFilters(prev => ({ 
                ...prev, 
                deadline_range: { 
                  ...prev.deadline_range,
                  start: e.target.value
                }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <input
              type="date"
              value={filters.deadline_range.end}
            onChange={(e) => {
                setFilters(prev => ({ 
                  ...prev, 
                  deadline_range: { 
                    ...prev.deadline_range,
                  end: e.target.value
                }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          {/* Priority Filter */}
          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              id="priority-filter"
              value={filters.priority || ''}
            onChange={(e) => {
              setFilters(prev => ({ 
                ...prev, 
                priority: e.target.value || null}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          {/* Clear Filters Button */}
          <div className="flex justify-end">
            <button
              onClick={handleFilterChange}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p className="text-sm">Error loading action items: {(error as Error).message}</p>
            </div>
          )}
          
          {/* Bulk Actions Section */}
          {selectedItems.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkUpdate('completed'))}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Mark Complete
            </button>
            <button
              onClick={() => handleBulkUpdate('pending'))}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              Mark Pending
            </button>
            <button
              onClick={() => setSelectedItems([])}}
                className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      
      {/* Progress Metrics */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Progress Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{progressMetrics.completionRate}%</p>
          <p className="text-sm text-gray-600">
              {progressMetrics.completed} of {progressMetrics.total} completed
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressMetrics.completionRate}%` }}
            ></div>
          </div>
        </div>
        
        {/* Kanban Board */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Action Items Board
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">
            To Do ({kanbanColumns.pending.length})
          </h4>
          <div className="min-h-200 space-y-3">
            {actionItems
              .filter(item => kanbanColumns.pending.includes(item.id))
              .map(item => (
                <div 
                  key={item.id}
                  className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
                <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(prev => [...prev, item.id]);
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                <div className="flex items-center justify-between mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800">{item.assignee}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {item.status}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-gray-500">
                  Due: {new Date(item.deadline).toLocaleDateString()}
                </span>
                {item.comments && (
                <p className="text-xs text-gray-600 mt-1">{item.comments}</p>
              </div>
            </div>
          </div>
        ))}
        
        {/* In Progress Column */}
        <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">
                Comments: {item.comments}
              </p>
            )}
          </div>
        </div>
        
        {/* Completed Column */}
        <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">
            Completed ({kanbanColumns.completed.length})
          </h4>
          <div className="min-h-200 space-y-3">
            {actionItems
              .filter(item => kanbanColumns.completed.includes(item.id))
              .map(item => (
                <div 
                  key={item.id}
                  className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
                <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                <div className="flex items-center justify-between mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800'}`}
                >
                  {item.assignee}
                </span>
                <span className="text-xs text-gray-500">
                  Due: {new Date(item.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
</>
);
};

export default UV_ActionItems;