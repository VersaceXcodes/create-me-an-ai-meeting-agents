import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Interface for agent data from API
interface Agent {
  id: string;
  name: string;
  meeting_type: string;
  status: 'active' | 'inactive' | 'paused';
}

// Navigation item interface
interface NavItem {
  id: string;
  name: string;
  icon: string;
  path: string;
  children?: NavItem[];
  shortcut?: string;
}

const GV_SidebarNavigation: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // Get current user from store
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  // Load user agents
  const { data: userAgents = [], isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['user-agents', currentUser?.id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents`,
        {
          params: {
            status: 'active',
            sort_by: 'last_used_at',
            sort_order: 'desc',
            limit: 10
        },
        {
          headers: {
            Authorization: `Bearer ${useAppStore.getState().authentication_state.auth_token`
          }
        }
      );
      return response.data.agents;
    },
    enabled: !!currentUser?.id && isAuthenticated,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Navigation items configuration
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      path: '/dashboard'
    },
    {
      id: 'agents',
      name: 'My Agents',
      icon: '🤖',
      path: '/agents',
      children: userAgents.map(agent => ({
        id: `agent-${agent.id}`,
        name: agent.name,
        icon: '🔹',
      path: `/agents/${agent.id}/config`
    },
    {
      id: 'meetings',
      name: 'Meetings',
      icon: '📅',
      children: [
      {
        id: 'meetings-setup',
        name: 'Schedule Meeting',
        path: '/meetings/setup'
    },
    {
      id: 'action-items',
      name: 'Action Items',
      icon: '✅',
      path: '/action-items'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📈',
        path: '/analytics'
      },
      {
        id: 'analytics-reports',
        name: 'Reports',
        icon: '📋',
        path: '/meetings/history'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: '⚙️',
        path: '/settings'
    }
  ]);

  // Determine active section based on current path
  const getActiveSection = (): string => {
    const path = location.pathname;
    
    if (path === '/' || path === '/dashboard') {
      return 'dashboard';
    } else if (path.startsWith('/agents')) {
      return 'agents';
    } else if (path.startsWith('/meetings')) {
      return 'meetings';
    } else if (path === '/action-items') {
      return 'action-items';
    } else if (path === '/analytics') {
      return 'analytics';
    } else if (path === '/settings') {
      return 'settings';
    }
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Check if section is expanded
  const isSectionExpanded = (sectionId: string) => {
    return expandedSections.includes(sectionId);
  };

  // Navigation items with dynamic agent children
  const navigationItems: NavItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      path: '/dashboard'
    },
    {
      id: 'agents',
      name: 'My Agents',
      icon: '🤖',
      path: '/agents',
      children: userAgents
  });

  return (
    <>
      <div 
        className={`
          fixed left-0 top-16 h-screen bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out z-40
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Collapse/Expand Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 truncate">
            {currentUser?.full_name || 'User'}
          </h2>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors">
            <svg 
              className="w-5 h-5 text-gray-500"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
              d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {/* Dashboard */}
            <li>
              <Link
                to="/dashboard"
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${activeSection === 'dashboard' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200"
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-gray-300"
                }`}
              >
                <span className="text-lg mr-3">{navItems[0].icon}</span>
                {!isCollapsed && (
                  <span className="flex-1">Dashboard</span>
                )}
              </Link>
            </li>
            
            {/* My Agents Section */}
            <li>
              <div className="space-y-1">
                <button
                  onClick={() => toggleSection('agents')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{navItems[1].icon}</button>
                  {!isCollapsed && (
                    <span className="flex-1 text-gray-700">
                    My Agents
                  </span>
                  {!isCollapsed && (
                    <svg 
                      className={`w-4 h-4 transform transition-transform ${
                    isSectionExpanded('agents') ? 'rotate-0' : '-rotate-90'}`}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
              
              {isSectionExpanded('agents') && !isCollapsed && (
                    <ul className="ml-6 space-y-1 border-l border-gray-200">
                  {userAgents.map(agent => (
                    <li key={agent.id}>
                      <Link
                        to={`/agents/${agent.id}/config`}
                        className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <span className="text-sm mr-2">{agent.icon}</span>
                        <span className="text-sm truncate">{agent.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
          
          {/* Meetings Section */}
          <li>
            <Link
              to="/meetings/setup"
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                >
                  {agent.icon}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Keyboard Shortcuts Help (only shown when expanded) */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Shortcuts
                </div>
            <div className="space-y-1">
            {navItems.map(item => (
              <div 
                key={item.id}
                className="text-xs text-gray-400"
              >
                <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded"
            >
              {item.shortcut}
            </div>
          </div>
        ))}
        
        {/* Bottom Section with User Info */}
        <div className="p-4 border-t border-gray-200">
              <div className="flex items-center">
                {currentUser?.profile_picture_url ? (
                  <img 
                    src={currentUser.profile_picture_url}
                    alt={currentUser.full_name}
                    className="w-8 h-8 rounded-full bg-gray-300 object-cover"
                    alt={currentUser.full_name}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"
                  >
                    <span className="text-sm text-blue-600">
                      {currentUser.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                {!isCollapsed && (
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">
                      {currentUser.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GV_SidebarNavigation;