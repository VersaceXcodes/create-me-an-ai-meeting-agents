import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on the provided Zod schemas
interface AiAgent {
  id: string;
  user_id: string;
  name: string;
  meeting_type: string;
  status: 'active' | 'inactive' | 'paused';
  participation_level: string;
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

interface AgentResponse {
  agents: AiAgent[];
  total_count: number;
}

// API functions
const fetchUserAgents = async (): Promise<AgentResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents`,
    {
      headers: {
        'Authorization': `Bearer ${useAppStore.getState().authentication_state.auth_token}`
      }
    }
  );
  return response.data;
};

const archiveAgent = async (agentId: string): Promise<AiAgent> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/${agentId}/archive`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${useAppStore.getState().authentication_state.auth_token}`
      }
    }
  );
  return response.data;
};

const restoreAgent = async (agentId: string): Promise<AiAgent> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/${agentId}/restore`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${useAppStore.getState().authentication_state.auth_token}`
      }
    }
  );
  return response.data;
};

const deleteAgent = async (agentId: string): Promise<{ agent_id: string }> => {
  await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/${agentId}`,
    {
      headers: {
        'Authorization': `Bearer ${useAppStore.getState().authentication_state.auth_token}`
      }
    }
  );
  return { agent_id: agentId };
};

const duplicateAgent = async (agentId: string): Promise<AiAgent> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/${agentId}/duplicate`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${useAppStore.getState().authentication_state.auth_token}`
      }
    }
  );
  return response.data;
};

const UV_AgentManagement: React.FC = () => {
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'last_used_at' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showArchived, setShowArchived] = useState(false);
  
  // Global state
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // React Query
  const queryClient = useQueryClient();
  
  const {
    data: agentsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchUserAgents,
    enabled: !!currentUser
  });

  // Mutations
  const archiveMutation = useMutation({
    mutationFn: archiveAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: restoreAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setSelectedAgents([]);
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  // Filter and sort agents
  const filteredAgents = agentsData?.agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? agent.status === statusFilter : true;
    const matchesArchive = showArchived ? agent.status === 'inactive' : agent.status !== 'inactive';
    
    return matchesSearch && matchesStatus && matchesArchive;
  }) || [];

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let aValue: string | number | null = a[sortBy];
    let bValue: string | number | null = b[sortBy];
    
    if (sortBy === 'last_used_at' || sortBy === 'created_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    
    if (sortOrder === 'asc') {
      return (aValue || '') < (bValue || '') ? -1 : 1;
    } else {
      return (aValue || '') > (bValue || '') ? -1 : 1;
    }
  });

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === sortedAgents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(sortedAgents.map(agent => agent.id));
    }
  };

  const handleArchiveSelected = () => {
    selectedAgents.forEach(agentId => {
      archiveMutation.mutate(agentId);
    });
  };

  const handleRestoreSelected = () => {
    selectedAgents.forEach(agentId => {
      restoreMutation.mutate(agentId);
    });
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedAgents.length} agent(s)? This action cannot be undone.`)) {
      selectedAgents.forEach(agentId => {
        deleteMutation.mutate(agentId);
      });
    }
  };

  const handleDuplicateAgent = (agentId: string) => {
    duplicateMutation.mutate(agentId);
  };

  const handleSortChange = (field: 'name' | 'last_used_at' | 'created_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never used';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'bg-green-100 text-green-800' };
      case 'inactive':
        return { label: 'Archived', color: 'bg-gray-100 text-gray-800' };
      case 'paused':
        return { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Agents</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your AI meeting assistants
                </p>
              </div>
              <Link
                to="/agents/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Agent
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search and Filter Bar */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search agents by name..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Archived</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {/* Sort */}
              <div className="sm:w-48">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as 'name' | 'last_used_at' | 'created_at');
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="last_used_at-desc">Last Used (Newest)</option>
                  <option value="last_used_at-asc">Last Used (Oldest)</option>
                  <option value="created_at-desc">Created (Newest)</option>
                  <option value="created_at-asc">Created (Oldest)</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Archived Toggle */}
            <div className="mt-4 flex items-center">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`text-sm font-medium ${
                  showArchived ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
            </div>
          </div>

          {/* Bulk Operations */}
          {selectedAgents.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedAgents.length} agent{selectedAgents.length === 1 ? '' : 's'} selected
                  </span>
                </div>
                <div className="flex space-x-2">
                  {sortedAgents.some(agent => selectedAgents.includes(agent.id) && agent.status === 'active') && (
                    <button
                      onClick={handleArchiveSelected}
                      disabled={archiveMutation.isPending}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                    </button>
                  )}
                  {sortedAgents.some(agent => selectedAgents.includes(agent.id) && agent.status === 'inactive') && (
                    <button
                      onClick={handleRestoreSelected}
                      disabled={restoreMutation.isPending}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <p className="mt-4 text-sm text-gray-600">Loading your agents...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-red-800">Unable to load agents</h3>
              <p className="mt-2 text-sm text-red-600">
                There was an error loading your agents. Please try again.
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && sortedAgents.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No agents found</h3>
              <p className="mt-2 text-sm text-gray-600">
                {searchQuery || statusFilter || showArchived
                  ? 'Try adjusting your search or filter to find what you are looking for.'
                  : 'Get started by creating your first AI meeting assistant.'}
              </p>
              <div className="mt-6">
                <Link
                  to="/agents/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create New Agent
                </Link>
              </div>
            </div>
          )}

          {/* Agents Grid/List */}
          {!isLoading && !error && sortedAgents.length > 0 && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {sortedAgents.map((agent) => {
                const statusInfo = getStatusInfo(agent.status);
                const isSelected = selectedAgents.includes(agent.id);
                
                return (
                  <div
                    key={agent.id}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    }`}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                            <p className="text-sm text-gray-500 capitalize">
                              {agent.meeting_type.replace('_', ' ')} Assistant
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleAgentSelect(agent.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Participation:</span>
                          <span className="text-gray-900 capitalize">
                            {agent.participation_level.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Last Used:</span>
                          <span className="text-gray-900">{formatDate(agent.last_used_at)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900">{formatDate(agent.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex justify-between items-center">
                        <div className="flex space-x-2">
                          <Link
                            to={`/agents/${agent.id}/config`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDuplicateAgent(agent.id)}
                            disabled={duplicateMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          {agent.status === 'active' ? (
                            <button
                              onClick={() => archiveMutation.mutate(agent.id)}
                              disabled={archiveMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                              {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                            </button>
                          ) : (
                            <button
                              onClick={() => restoreMutation.mutate(agent.id)}
                              disabled={restoreMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
                                deleteMutation.mutate(agent.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Stats */}
          {!isLoading && !error && sortedAgents.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>
                  Showing {sortedAgents.length} of {agentsData?.total_count} agents
                </span>
                <div className="flex space-x-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    {selectedAgents.length === sortedAgents.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedAgents.length > 0 && (
                    <>
                      <button
                        onClick={handleArchiveSelected}
                        disabled={archiveMutation.isPending}
                        className="text-gray-600 hover:text-gray-500 disabled:opacity-50"
                      >
                        Archive Selected
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-500 disabled:opacity-50"
                      >
                        Delete Selected
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AgentManagement;