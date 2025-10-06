import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

interface ProfileFormData {
  full_name: string;
  profile_picture_url: string | null;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
}

interface PreferencesFormData {
  email_notifications: boolean;
  push_notifications: boolean;
  follow_up_reminders: boolean;
}

interface FormError {
  field: string;
  message: string;
}

const UV_ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Zustand store state
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateUserPreferences = useAppStore(state => state.update_user_preferences);
  
  // Local state
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    full_name: '',
    profile_picture_url: null
  });
  
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    current_password: '',
    new_password: ''
  });
  
  const [preferencesFormData, setPreferencesFormData] = useState<PreferencesFormData>({
    email_notifications: true,
    push_notifications: true,
    follow_up_reminders: true
  });
  
  const [formErrors, setFormErrors] = useState<FormError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'preferences' | 'data' | 'account'>('profile');

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
  });

  // Fetch user preferences
  const { data: userPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me/preferences`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
  });

  // Update profile form data when user profile loads
  useEffect(() => {
    if (userProfile) {
      setProfileFormData({
        full_name: userProfile.full_name || '',
        profile_picture_url: userProfile.profile_picture_url
      });
    }
  }, [userProfile]);

  // Update preferences form data when user preferences load
  useEffect(() => {
    if (userPreferences) {
      setPreferencesFormData({
        email_notifications: userPreferences.email_notifications,
        push_notifications: userPreferences.push_notifications,
        follow_up_reminders: userPreferences.follow_up_reminders
      });
    }
  }, [userPreferences]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        data,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Update global store
      useAppStore.setState(state => ({
        authentication_state: {
          ...state.authentication_state,
          current_user: data
        }
      }));
      
      setSaveSuccess(true);
      setFormErrors([]);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      setFormErrors([{
        field: 'general',
        message: error.response?.data?.message || 'Failed to update profile'
      }]);
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me/password`,
        data,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setPasswordFormData({ current_password: '', new_password: '' });
      setSaveSuccess(true);
      setFormErrors([]);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      setFormErrors([{
        field: 'password',
        message: error.response?.data?.message || 'Failed to change password'
      }]);
    }
  });

  // Preferences update mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: PreferencesFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me/preferences`,
        data,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Update global store
      updateUserPreferences(data);
      setSaveSuccess(true);
      setFormErrors([]);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      setFormErrors([{
        field: 'preferences',
        message: error.response?.data?.message || 'Failed to update preferences'
      }]);
    }
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      // This endpoint doesn't exist yet, so we'll mock it for now
      throw new Error('Data export endpoint not implemented');
    },
    onError: (error: any) => {
      setFormErrors([{
        field: 'export',
        message: error.response?.data?.message || 'Data export feature is not available yet'
      }]);
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // This endpoint doesn't exist yet, so we'll mock it for now
      throw new Error('Account deletion endpoint not implemented');
    },
    onError: (error: any) => {
      setFormErrors([{
        field: 'delete',
        message: error.response?.data?.message || 'Account deletion is not available yet'
      }]);
    }
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors([]);
    
    try {
      await updateProfileMutation.mutateAsync(profileFormData);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordFormData.new_password.length < 8) {
      setFormErrors([{
        field: 'new_password',
        message: 'Password must be at least 8 characters long'
      }]);
      return;
    }
    
    setIsLoading(true);
    setFormErrors([]);
    
    try {
      await changePasswordMutation.mutateAsync(passwordFormData);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors([]);
    
    try {
      await updatePreferencesMutation.mutateAsync(preferencesFormData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    setFormErrors([]);
    
    try {
      await exportDataMutation.mutateAsync();
      // If successful, this would trigger a file download
      // For now, we'll show a success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setFormErrors([]);
    
    try {
      await deleteAccountMutation.mutateAsync();
      // This would log the user out and redirect to home
      useAppStore.getState().logout_user();
      navigate('/');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getErrorMessage = (field: string): string | null => {
    return formErrors.find(error => error.field === field)?.message || null;
  };

  const clearError = (field: string) => {
    setFormErrors(prev => prev.filter(error => error.field !== field));
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Settings saved successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {getErrorMessage('general') && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {getErrorMessage('general')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'profile', label: 'Profile', icon: '👤' },
                  { id: 'password', label: 'Password', icon: '🔒' },
                  { id: 'preferences', label: 'Preferences', icon: '🔔' },
                  { id: 'data', label: 'Data', icon: '📊' },
                  { id: 'account', label: 'Account', icon: '⚙️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id as any)}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors ${
                      activeSection === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Update your personal information and profile picture
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="full_name"
                        value={profileFormData.full_name}
                        onChange={(e) => {
                          clearError('full_name');
                          setProfileFormData(prev => ({ ...prev, full_name: e.target.value }));
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter your full name"
                      />
                      {getErrorMessage('full_name') && (
                        <p className="mt-1 text-sm text-red-600" aria-live="polite">
                          {getErrorMessage('full_name')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={userProfile?.email || ''}
                        disabled
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Email cannot be changed. Contact support if you need to update your email.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Profile Picture
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-medium">
                        {userProfile?.profile_picture_url ? (
                          <img
                            src={userProfile.profile_picture_url}
                            alt="Profile"
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement file upload
                            setFormErrors([{
                              field: 'profile_picture',
                              message: 'Profile picture upload is not yet implemented'
                            }]);
                          }}
                          className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Change Photo
                        </button>
                        {getErrorMessage('profile_picture') && (
                          <p className="mt-1 text-sm text-red-600" aria-live="polite">
                            {getErrorMessage('profile_picture')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading || profileLoading}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Password Section */}
              {activeSection === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Update your password to keep your account secure
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="current_password"
                        value={passwordFormData.current_password}
                        onChange={(e) => {
                          clearError('current_password');
                          clearError('password');
                          setPasswordFormData(prev => ({ ...prev, current_password: e.target.value }));
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter your current password"
                      />
                      {getErrorMessage('current_password') && (
                        <p className="mt-1 text-sm text-red-600" aria-live="polite">
                          {getErrorMessage('current_password')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="new_password"
                        value={passwordFormData.new_password}
                        onChange={(e) => {
                          clearError('new_password');
                          clearError('password');
                          setPasswordFormData(prev => ({ ...prev, new_password: e.target.value }));
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter your new password"
                      />
                      {getErrorMessage('new_password') && (
                        <p className="mt-1 text-sm text-red-600" aria-live="polite">
                          {getErrorMessage('new_password')}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        Password must be at least 8 characters long
                      </p>
                    </div>
                  </div>

                  {getErrorMessage('password') && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600" aria-live="polite">
                        {getErrorMessage('password')}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Preferences Section */}
              {activeSection === 'preferences' && (
                <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage how you receive notifications from the application
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Receive email notifications for important updates
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreferencesFormData(prev => ({
                          ...prev,
                          email_notifications: !prev.email_notifications
                        }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          preferencesFormData.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={preferencesFormData.email_notifications}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            preferencesFormData.email_notifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Receive push notifications in the application
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreferencesFormData(prev => ({
                          ...prev,
                          push_notifications: !prev.push_notifications
                        }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          preferencesFormData.push_notifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={preferencesFormData.push_notifications}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            preferencesFormData.push_notifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Follow-up Reminders</h4>
                        <p className="text-sm text-gray-500">
                          Get reminders for action items and follow-up tasks
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreferencesFormData(prev => ({
                          ...prev,
                          follow_up_reminders: !prev.follow_up_reminders
                        }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          preferencesFormData.follow_up_reminders ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={preferencesFormData.follow_up_reminders}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            preferencesFormData.follow_up_reminders ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {getErrorMessage('preferences') && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600" aria-live="polite">
                        {getErrorMessage('preferences')}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading || preferencesLoading}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Preferences'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Data Section */}
              {activeSection === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Data Management</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage your data and export options
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Export Your Data</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Download a copy of all your data in JSON format
                        </p>
                      </div>
                      <button
                        onClick={handleExportData}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {getErrorMessage('export') && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600" aria-live="polite">
                        {getErrorMessage('export')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Account Management</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage your account settings and data
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-red-800">Danger Zone</h4>
                        <p className="mt-2 text-sm text-red-600">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <div className="mt-4">
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {getErrorMessage('delete') && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600" aria-live="polite">
                        {getErrorMessage('delete')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Delete Account
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Deleting...' : 'Delete Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ProfileSettings;