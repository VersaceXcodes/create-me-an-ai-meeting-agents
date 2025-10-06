import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

// ========== TYPE DEFINITIONS ==========

// User Types
interface User {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  follow_up_reminders: boolean;
  created_at: string;
  updated_at: string;
}

interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string | null;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  created_at: string;
  updated_at: string;
}

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

interface MeetingSummary {
  id: string;
  meeting_id: string;
  key_discussion_points: string;
  decisions_made: string | null;
  sentiment_analysis: string | null;
  participant_engagement: string | null;
  generated_summary: string;
  edited_summary: string | null;
  generated_at: string;
  edited_at: string | null;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

interface MeetingTranscript {
  id: string;
  meeting_id: string;
  speaker: string | null;
  content: string;
  timestamp: string;
  created_at: string;
}

interface MeetingRecording {
  id: string;
  meeting_id: string;
  recording_url: string | null;
  storage_duration: number;
  file_size: number | null;
  created_at: string;
}

interface MeetingAnalytics {
  id: string;
  user_id: string;
  total_meeting_time: number;
  participation_distribution: string | null;
  action_item_completion_rate: number | null;
  meeting_sentiment_trends: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action: { type: string; path: string } | null;
}

// Store State Interface
interface AppState {
  // Authentication State
  authentication_state: {
    current_user: User | null;
    auth_token: string | null;
    authentication_status: {
      is_authenticated: boolean;
      is_loading: boolean;
    };
    error_message: string | null;
  };
  
  // Calendar Integrations
  calendar_integrations: CalendarIntegration[];
  
  // User Preferences
  user_preferences: UserPreferences | null;
  
  // Application Data
  upcoming_meetings: Meeting[];
  action_items: ActionItem[];
  agents: AiAgent[];
  
  // Notifications
  notifications: {
    items: Notification[];
    unread_count: number;
    show_notification_center: boolean;
  };
  
  // Real-time State
  realtime: {
    socket: Socket | null;
    is_connected: boolean;
    subscribed_events: string[];
  };
  
  // Actions
  initialize_auth: () => Promise<void>;
  login_user: (email: string, password: string, remember_me?: boolean) => Promise<void>;
  logout_user: () => void;
  register_user: (email: string, password: string, full_name: string, profile_picture_url?: string) => Promise<void>;
  request_password_reset: (email: string) => Promise<void>;
  reset_password: (token: string, new_password: string) => Promise<void>;
  connect_calendar: (provider: string, credentials: any) => Promise<void>;
  disconnect_calendar: (integration_id: string) => Promise<void>;
  update_user_preferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  add_notification: (notification: Omit<Notification, 'id'>) => Promise<void>;
  mark_notification_read: (notification_id: string) => void;
  clear_auth_error: () => void;
  
  // Realtime Event Handlers
  handle_realtime_events: () => void;
  subscribe_to_realtime_events: (events: string[]) => void;
  unsubscribe_from_realtime_events: (events: string[]) => void;
}

// ========== ZUSTAND STORE IMPLEMENTATION ==========

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true, // Start as loading for initial auth check
    };
    error_message: null,
  },
  
  calendar_integrations: [],
  
  user_preferences: null,
  
  upcoming_meetings: [],
  
  action_items: [],
  
      agents: [],
      
      notifications: {
        items: [],
        unread_count: 0,
        show_notification_center: false,
      },
      
      realtime: {
        socket: null,
        is_connected: false,
        subscribed_events: [],
    },
    
    // ========== AUTHENTICATION ACTIONS ==========
    
    initialize_auth: async () => {
      const { authentication_state } = get();
      const token = authentication_state.auth_token;
      
      if (!token) {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
          is_loading: false,
        },
      },
      }));
      
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { user } = response.data;
        
        set((state) => ({
          authentication_state: {
            current_user: user,
            auth_token: token,
            authentication_status: {
              is_authenticated: true,
              is_loading: false,
            },
            error_message: null,
          },
        }));
      } catch (error) {
        // Token is invalid, clear auth state
        set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
        }));
      }
    },

    login_user: async (email: string, password: string, remember_me = false) => {
      set((state) => ({
        authentication_state: {
          ...state.authentication_state,
          authentication_status: {
            ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
            { email, password, remember_me },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, auth_token } = response.data;

          set((state) => ({
            authentication_state: {
              current_user: user,
              auth_token,
              authentication_status: {
              is_authenticated: true,
              is_loading: false,
            },
            error_message: null,
          },
        }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          throw new Error(errorMessage);
        }
      },

      logout_user: () => {
        const { realtime } = get();
        
        // Close WebSocket connection
        if (realtime.socket) {
          realtime.socket.disconnect();
        }

        set((state) => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
        }));
      },

      register_user: async (email: string, password: string, full_name: string, profile_picture_url?: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
            { email, password, full_name, profile_picture_url },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const { user, auth_token } = response.data;

        set((state) => ({
          authentication_state: {
            current_user: user,
            auth_token,
          authentication_status: {
            is_authenticated: true,
            is_loading: false,
          },
        }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
        
        set((state) => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: errorMessage,
          },
        }));
        throw new Error(errorMessage);
      }
    },

    request_password_reset: async (email: string) => {
      try {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/password-reset`,
        { email },
        { headers: { 'Content-Type': 'application/json' } }
        );

        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Password reset request failed';
        
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          throw new Error(errorMessage);
      }
    },

    reset_password: async (token: string, new_password: string) => {
      try {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/password-reset/${token}`,
          { new_password },
          { headers: { 'Content-Type': 'application/json' } }
        );

        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Password reset failed';
        
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          throw new Error(errorMessage);
      }
    },

    clear_auth_error: () => {
      set((state) => ({
        authentication_state: {
          ...state.authentication_state,
          error_message: null,
        },
      }));
    },

    // ========== CALENDAR INTEGRATION ACTIONS ==========
    
    connect_calendar: async (provider: string, credentials: any) => {
      set((state) => ({
        authentication_state: {
          ...state.authentication_state,
          authentication_status: {
            ...state.authentication_state.authentication_status,
            is_loading: false,
          },
        },
        error_message: null,
      },
    })),

    disconnect_calendar: async (integration_id: string) => {
      try {
        await axios.delete(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/integrations/calendar/${integration_id}`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        set((state) => ({
          calendar_integrations: state.calendar_integrations.filter(
            integration => integration.id !== integration_id
          ),
        });
      } catch (error: any) {
        throw new Error('Failed to disconnect calendar');
      }
    },

    update_user_preferences: async (preferences: Partial<UserPreferences>) => {
      try {
        const response = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/integrations/calendar`,
          credentials,
          { headers: { 'Content-Type': 'application/json' } }
        );

        set((state) => ({
          user_preferences: {
            ...state.user_preferences,
            ...preferences,
          },
        }));
      } catch (error: any) {
        throw new Error('Failed to connect calendar');
      }
    },

    // ========== NOTIFICATIONS ACTIONS ==========
    
    add_notification: async (notification: Omit<Notification, 'id'>) => {
      const newNotification: Notification = {
          id: `notif_${Date.now()}`,
          ...notification,
        };

        set((state) => ({
          notifications: {
            ...state.notifications,
            items: [...state.notifications.items, newNotification],
            unread_count: state.notifications.unread_count + 1,
        });
      },

    mark_notification_read: (notification_id: string) => {
      set((state) => ({
        notifications: {
          ...state.notifications,
          unread_count: state.notifications.items.filter(item => !item.read).length,
          },
        }));
      },

    // ========== REAL-TIME ACTIONS ==========
    
    handle_realtime_events: () => {
      const { authentication_state, realtime } = get();
      
      if (!authentication_state.auth_token || !realtime.socket) {
        return;
      }

      const updatedItems = state.notifications.items.map(item =>
          item.id === notification_id ? { ...item, read: true } : item
        );

        set((state) => ({
          realtime: {
            ...state.realtime,
            socket: io(
              import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}`,
              {
                auth: {
                  token: authentication_state.auth_token,
            },
          });
        };
      },
    })),

    subscribe_to_realtime_events: (events: string[]) => {
      set((state) => ({
        realtime: {
          ...state.realtime,
          subscribed_events: [...state.realtime.subscribed_events, ...events],
          },
        }));
      },

    unsubscribe_from_realtime_events: (events: string[]) => {
      set((state) => ({
        realtime: {
          ...state.realtime,
          subscribed_events: state.realtime.subscribed_events.filter(
            event => !events.includes(event)
          ),
        });
      },

    // ========== WEBSOCKET HANDLERS ==========
    
    // This would be set up when the socket connects
    // For now, we'll leave this as a placeholder for the actual implementation
    ),
    {
      name: 'app-auth-storage',
      // CRITICAL: Only persist auth-related data to avoid issues
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
        },
      }),
    }
  )
);

// Export individual selector functions for optimized usage
export const useCurrentUser = () => useAppStore(state => state.authentication_state.current_user);
export const useAuthToken = () => useAppStore(state => state.authentication_state.auth_token);
export const useIsAuthenticated = () => useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
export const useIsAuthLoading = () => useAppStore(state => state.authentication_state.authentication_status.is_loading);
export const useAuthError = () => useAppStore(state => state.authentication_state.error_message);
export const useCalendarIntegrations = () => useAppStore(state => state.calendar_integrations);
export const useUserPreferences = () => useAppStore(state => state.user_preferences);
export const useUpcomingMeetings = () => useAppStore(state => state.upcoming_meetings);
export const useActionItems = () => useAppStore(state => state.action_items);
export const useAgents = () => useAppStore(state => state.agents);
export const useNotifications = () => useAppStore(state => state.notifications);

export type {
  User,
  UserPreferences,
  CalendarIntegration,
  AiAgent,
  Meeting,
  ActionItem,
  MeetingSummary,
  MeetingTranscript,
  MeetingRecording,
  MeetingAnalytics,
  Notification,
};