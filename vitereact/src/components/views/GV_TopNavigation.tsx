import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';

interface SearchResult {
  agents: Array<{
    id: string;
    name: string;
    type: string;
    meeting_type: string;
    last_used_at: string | null;
  };
  meetings: Array<any>;
  notes: Array<any>;
}

const GV_TopNavigation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult>({
    agents: [],
    meetings: [],
    notes: []
  });
  
  // CRITICAL: Individual selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const upcomingMeetings = useAppStore(state => state.upcoming_meetings);
  const actionItems = useAppStore(state => state.action_items);
  
  // Global state actions
  const logoutUser = useAppStore(state => state.logout_user);
  
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Get breadcrumbs from current location
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
  
  const breadcrumbs = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Agents', href: '/agents' },
    { name: 'Meetings', href: '/meetings' },
    { name: 'Analytics', href: '/analytics' }
  ];
  
  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Calculate unread notification count
  useEffect(() => {
    // This would be populated from global state
    setUnreadNotificationCount(0); // Initial value
  }, []);
  
  const performGlobalSearch = async () => {
    try {
      // Mock search implementation - in production this would call the backend
      const mockResults: SearchResult = {
      agents: [
        {
          id: 'agent_1',
          name: 'Sales Assistant',
          type: 'agent',
          meeting_type: 'client_meeting',
          last_used_at: '2023-06-01T10:00:00Z'
        }
      ],
      meetings: [],
      notes: []
    };
    
    setSearchResults(mockResults);
  };
  
  const handleLogout = () => {
    logoutUser();
    setShowUserMenu(false);
  };
  
  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (currentPath === '/dashboard') return 'Dashboard';
    if (currentPath.startsWith('/agents')) return 'My Agents';
    if (currentPath.startsWith('/meetings')) return 'Meetings';
    if (currentPath.startsWith('/analytics')) return 'Analytics';
    return 'MeetMate AI';
  };
  
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Breadcrumbs */}
            <div className="flex items-center space-x-4">
              {/* Logo/Brand */}
              <div className="flex-shrink-0 flex items-center">
                <Link 
                  to="/dashboard"
                  className="text-xl font-bold text-blue-600 hover:text-blue-700">
                  MeetMate AI
                </Link>
                
                {/* Breadcrumbs - Desktop only */}
                <div className="hidden md:ml-6 md:flex md:space-x-4">
              <span className="text-gray-500">/</span>
              {breadcrumbs.map((crumb, index) => (
              <span key={crumb.name} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-gray-400">›</span>
              <Link 
                to={crumb.href}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                    {crumb.name}
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Mobile hamburger menu */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <span className="sr-only">Open main menu</span>
                <div className="w-6 h-px bg-gray-600 mb-1"></div>
                <div className="w-6 h-px bg-gray-600"></div>
                <div className="w-6 h-px bg-gray-600"></div>
              </button>
            </div>
          </div>
          
          {/* Center - Search bar */}
          <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
              <div className="max-w-lg w-full lg:max-w-xs">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2 5a7 7 0 10-14 0 7 7 0 00-14 0 7 7 0 006 0 7 7 0 0010 0 7 7 0 000-14z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search agents, meetings, notes..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                    performGlobalSearch();
                  }
                  }}
                  aria-label="Search"
                />
              </div>
              
              {/* Search results dropdown */}
              {searchQuery && searchResults.agents.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div className="py-1">
                  {searchResults.agents.map(agent => (
                  <Link
                    key={agent.id}
                    to={`/agents/${agent.id}/config`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.meeting_type} agent</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right side - Navigation items */}
          <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500">
                <span className="sr-only">View notifications</span>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z" />
                  </svg>
                  
                  {/* Notification badge */}
                  {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 transform translate-x-1/2 -translate-y-1/2">
                    <span className="sr-only">Notifications</span>
                    <span className="absolute top-0 right-0 block h-2 w-2 bg-red-400 rounded-full"></span>
                <span className="absolute top-0 right-0 block h-2 w-2 bg-red-400 rounded-full"></span>
                  )}
                </button>
                
                {/* Notifications dropdown */}
                {showNotifications && (
              <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {actionItems.length > 0 ? (
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">
                        Notifications
                      </div>
                      <div className="border-t border-gray-100"></div>
                      {actionItems.slice(0, 5).map(item => (
                    <div key={item.id} className="px-4 py-2">
                          <div className="text-xs font-medium text-gray-500">No new notifications</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Workspace Switcher (Placeholder) */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center text-sm rounded-full bg-gray-200 text-gray-800">
                        {unreadNotificationCount} unread
                      </div>
                    ) : (
                  <div className="px-4 py-2 text-sm text-gray-700">
                      Workspace
                    </div>
                  </div>
                </button>
              </div>
              
              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span className="sr-only">Open user menu</span>
                  {currentUser?.profile_picture_url ? (
                <img
                  className="h-8 w-8 rounded-full"
                  src={currentUser.profile_picture_url}
                  alt={`${currentUser?.full_name}'s profile" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {currentUser?.full_name?.charAt(0) || 'U'}
                </div>
              </button>
              
              {/* User dropdown menu */}
              {showUserMenu && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <div className="px-4 py-2">
                        <span className="block text-sm text-gray-900">Profile</div>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Settings
                      </div>
                    </Link>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <span className="block text-sm">Logout</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GV_TopNavigation;