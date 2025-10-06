import { z } from 'zod';

// ========== USERS ==========
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  password_hash: z.string(),
  profile_picture_url: z.string().url().nullable(),
  email_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  is_active: z.boolean()
});

export const createUserInputSchema = z.object({
  email: z.string().email().min(1),
  full_name: z.string().min(1).max(255),
  password_hash: z.string().min(1),
  profile_picture_url: z.string().url().optional(),
  email_verified: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export const updateUserInputSchema = z.object({
  id: z.string(),
  email: z.string().email().min(1).optional(),
  full_name: z.string().min(1).max(255).optional(),
  profile_picture_url: z.string().url().nullable().optional(),
  email_verified: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export const searchUsersInputSchema = z.object({
  query: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['email', 'full_name', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;

// ========== PASSWORD RESET TOKENS ==========
export const passwordResetTokenSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  token: z.string(),
  expires_at: z.coerce.date()
});

export const createPasswordResetTokenInputSchema = z.object({
  user_id: z.string(),
  token: z.string(),
  expires_at: z.coerce.date()
});

export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type CreatePasswordResetTokenInput = z.infer<typeof createPasswordResetTokenInputSchema>;

// ========== USER PREFERENCES ==========
export const userPreferencesSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  follow_up_reminders: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createUserPreferencesInputSchema = z.object({
  user_id: z.string(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  follow_up_reminders: z.boolean().optional()
});

export const updateUserPreferencesInputSchema = z.object({
  id: z.string(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  follow_up_reminders: z.boolean().optional()
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type CreateUserPreferencesInput = z.infer<typeof createUserPreferencesInputSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesInputSchema>;

// ========== CALENDAR INTEGRATIONS ==========
export const calendarIntegrationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  provider: z.string(),
  provider_user_id: z.string().nullable(),
  email: z.string().email().nullable(),
  access_token: z.string().nullable(),
  refresh_token: z.string().nullable(),
  is_connected: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createCalendarIntegrationInputSchema = z.object({
  user_id: z.string(),
  provider: z.string().min(1),
  provider_user_id: z.string().optional(),
  email: z.string().email().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  is_connected: z.boolean().optional()
});

export const updateCalendarIntegrationInputSchema = z.object({
  id: z.string(),
  provider: z.string().min(1).optional(),
  provider_user_id: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  access_token: z.string().nullable().optional(),
  refresh_token: z.string().nullable().optional(),
  is_connected: z.boolean().optional()
});

export const searchCalendarIntegrationsInputSchema = z.object({
  user_id: z.string().optional(),
  provider: z.string().optional(),
  is_connected: z.boolean().optional()
});

export type CalendarIntegration = z.infer<typeof calendarIntegrationSchema>;
export type CreateCalendarIntegrationInput = z.infer<typeof createCalendarIntegrationInputSchema>;
export type UpdateCalendarIntegrationInput = z.infer<typeof updateCalendarIntegrationInputSchema>;
export type SearchCalendarIntegrationsInput = z.infer<typeof searchCalendarIntegrationsInputSchema>;

// ========== AI AGENTS ==========
export const aiAgentStatusEnum = z.enum(['active', 'inactive', 'paused']);
export const aiAgentParticipationLevelEnum = z.enum(['observer', 'active_participant', 'passive_observer']);

export const aiAgentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  meeting_type: z.string(),
  status: aiAgentStatusEnum,
  participation_level: aiAgentParticipationLevelEnum,
  primary_objectives: z.string(),
  voice_settings: z.string().nullable(),
  custom_instructions: z.string().nullable(),
  speaking_triggers: z.string().nullable(),
  note_taking_focus: z.string().nullable(),
  follow_up_templates: z.string().nullable(),
  last_used_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createAiAgentInputSchema = z.object({
  user_id: z.string(),
  name: z.string().min(1).max(255),
  meeting_type: z.string().min(1),
  status: aiAgentStatusEnum.optional(),
  participation_level: aiAgentParticipationLevelEnum.optional(),
  primary_objectives: z.string().min(1),
  voice_settings: z.string().optional(),
  custom_instructions: z.string().optional(),
  speaking_triggers: z.string().optional(),
  note_taking_focus: z.string().optional(),
  follow_up_templates: z.string().optional()
});

export const updateAiAgentInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  meeting_type: z.string().min(1).optional(),
  status: aiAgentStatusEnum.optional(),
  participation_level: aiAgentParticipationLevelEnum.optional(),
  primary_objectives: z.string().min(1).optional(),
  voice_settings: z.string().nullable().optional(),
  custom_instructions: z.string().nullable().optional(),
  speaking_triggers: z.string().nullable().optional(),
  note_taking_focus: z.string().nullable().optional(),
  follow_up_templates: z.string().nullable().optional()
});

export const searchAiAgentsInputSchema = z.object({
  user_id: z.string().optional(),
  meeting_type: z.string().optional(),
  status: aiAgentStatusEnum.optional(),
  participation_level: aiAgentParticipationLevelEnum.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'last_used_at', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type AiAgent = z.infer<typeof aiAgentSchema>;
export type CreateAiAgentInput = z.infer<typeof createAiAgentInputSchema>;
export type UpdateAiAgentInput = z.infer<typeof updateAiAgentInputSchema>;
export type SearchAiAgentsInput = z.infer<typeof searchAiAgentsInputSchema>;

// ========== AGENT TEMPLATES ==========
export const agentTemplateParticipationLevelEnum = z.enum(['observer', 'active_participant', 'passive_observer']);

export const agentTemplateSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  meeting_type: z.string(),
  participation_level: agentTemplateParticipationLevelEnum,
  primary_objectives: z.string(),
  voice_settings: z.string().nullable(),
  custom_instructions: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createAgentTemplateInputSchema = z.object({
  user_id: z.string(),
  name: z.string().min(1).max(255),
  meeting_type: z.string().min(1),
  participation_level: agentTemplateParticipationLevelEnum,
  primary_objectives: z.string().min(1),
  voice_settings: z.string().optional(),
  custom_instructions: z.string().optional(),
  is_public: z.boolean().optional()
});

export const updateAgentTemplateInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  meeting_type: z.string().min(1).optional(),
  participation_level: agentTemplateParticipationLevelEnum.optional(),
  primary_objectives: z.string().min(1).optional(),
  voice_settings: z.string().nullable().optional(),
  custom_instructions: z.string().nullable().optional(),
  is_public: z.boolean().optional()
});

export const searchAgentTemplatesInputSchema = z.object({
  user_id: z.string().optional(),
  meeting_type: z.string().optional(),
  participation_level: agentTemplateParticipationLevelEnum.optional(),
  is_public: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type AgentTemplate = z.infer<typeof agentTemplateSchema>;
export type CreateAgentTemplateInput = z.infer<typeof createAgentTemplateInputSchema>;
export type UpdateAgentTemplateInput = z.infer<typeof updateAgentTemplateInputSchema>;
export type SearchAgentTemplatesInput = z.infer<typeof searchAgentTemplatesInputSchema>;

// ========== MEETINGS ==========
export const meetingStatusEnum = z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled']);

export const meetingSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  calendar_event_id: z.string().nullable(),
  meeting_type: z.string(),
  agenda: z.string().nullable(),
  desired_outcomes: z.string().nullable(),
  special_instructions: z.string().nullable(),
  status: meetingStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createMeetingInputSchema = z.object({
  user_id: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  calendar_event_id: z.string().optional(),
  meeting_type: z.string().min(1),
  agenda: z.string().optional(),
  desired_outcomes: z.string().optional(),
  special_instructions: z.string().optional(),
  status: meetingStatusEnum.optional()
});

export const updateMeetingInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  calendar_event_id: z.string().nullable().optional(),
  meeting_type: z.string().min(1).optional(),
  agenda: z.string().nullable().optional(),
  desired_outcomes: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
  status: meetingStatusEnum.optional()
});

export const searchMeetingsInputSchema = z.object({
  user_id: z.string().optional(),
  meeting_type: z.string().optional(),
  status: meetingStatusEnum.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['start_time', 'created_at', 'title']).default('start_time'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Meeting = z.infer<typeof meetingSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingInputSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingInputSchema>;
export type SearchMeetingsInput = z.infer<typeof searchMeetingsInputSchema>;

// ========== MEETING AGENTS ==========
export const meetingAgentJoinStatusEnum = z.enum(['pending', 'joined', 'declined', 'left']);

export const meetingAgentSchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  agent_id: z.string(),
  join_status: meetingAgentJoinStatusEnum,
  joined_at: z.coerce.date().nullable(),
  left_at: z.coerce.date().nullable()
});

export const createMeetingAgentInputSchema = z.object({
  meeting_id: z.string(),
  agent_id: z.string(),
  join_status: meetingAgentJoinStatusEnum.optional()
});

export const updateMeetingAgentInputSchema = z.object({
  id: z.string(),
  join_status: meetingAgentJoinStatusEnum.optional(),
  joined_at: z.coerce.date().optional(),
  left_at: z.coerce.date().optional()
});

export type MeetingAgent = z.infer<typeof meetingAgentSchema>;
export type CreateMeetingAgentInput = z.infer<typeof createMeetingAgentInputSchema>;
export type UpdateMeetingAgentInput = z.infer<typeof updateMeetingAgentInputSchema>;

// ========== MEETING PARTICIPANTS ==========
export const meetingParticipantSchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  role: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createMeetingParticipantInputSchema = z.object({
  meeting_id: z.string(),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  role: z.string().optional()
});

export const updateMeetingParticipantInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().nullable().optional(),
  role: z.string().nullable().optional()
});

export const searchMeetingParticipantsInputSchema = z.object({
  meeting_id: z.string().optional(),
  email: z.string().email().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type MeetingParticipant = z.infer<typeof meetingParticipantSchema>;
export type CreateMeetingParticipantInput = z.infer<typeof createMeetingParticipantInputSchema>;
export type UpdateMeetingParticipantInput = z.infer<typeof updateMeetingParticipantInputSchema>;
export type SearchMeetingParticipantsInput = z.infer<typeof searchMeetingParticipantsInputSchema>;

// ========== MEETING SUMMARIES ==========
export const meetingSummarySchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  key_discussion_points: z.string(),
  decisions_made: z.string().nullable(),
  sentiment_analysis: z.string().nullable(),
  participant_engagement: z.string().nullable(),
  generated_summary: z.string(),
  edited_summary: z.string().nullable(),
  generated_at: z.coerce.date(),
  edited_at: z.coerce.date().nullable(),
  is_finalized: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createMeetingSummaryInputSchema = z.object({
  meeting_id: z.string(),
  key_discussion_points: z.string().min(1),
  decisions_made: z.string().optional(),
  sentiment_analysis: z.string().optional(),
  participant_engagement: z.string().optional(),
  generated_summary: z.string().min(1),
  is_finalized: z.boolean().optional()
});

export const updateMeetingSummaryInputSchema = z.object({
  id: z.string(),
  key_discussion_points: z.string().min(1).optional(),
  decisions_made: z.string().nullable().optional(),
  sentiment_analysis: z.string().nullable().optional(),
  participant_engagement: z.string().nullable().optional(),
  generated_summary: z.string().min(1).optional(),
  edited_summary: z.string().nullable().optional(),
  is_finalized: z.boolean().optional()
});

export type MeetingSummary = z.infer<typeof meetingSummarySchema>;
export type CreateMeetingSummaryInput = z.infer<typeof createMeetingSummaryInputSchema>;
export type UpdateMeetingSummaryInput = z.infer<typeof updateMeetingSummaryInputSchema>;

// ========== ACTION ITEMS ==========
export const actionItemStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

export const actionItemSchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  description: z.string(),
  assignee: z.string(),
  deadline: z.coerce.date(),
  status: actionItemStatusEnum,
  comments: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createActionItemInputSchema = z.object({
  meeting_id: z.string(),
  description: z.string().min(1),
  assignee: z.string().min(1),
  deadline: z.coerce.date(),
  status: actionItemStatusEnum.optional(),
  comments: z.string().optional()
});

export const updateActionItemInputSchema = z.object({
  id: z.string(),
  description: z.string().min(1).optional(),
  assignee: z.string().min(1).optional(),
  deadline: z.coerce.date().optional(),
  status: actionItemStatusEnum.optional(),
  comments: z.string().nullable().optional()
});

export const searchActionItemsInputSchema = z.object({
  meeting_id: z.string().optional(),
  assignee: z.string().optional(),
  status: actionItemStatusEnum.optional(),
  deadline_before: z.coerce.date().optional(),
  deadline_after: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['deadline', 'created_at', 'status']).default('deadline'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type ActionItem = z.infer<typeof actionItemSchema>;
export type CreateActionItemInput = z.infer<typeof createActionItemInputSchema>;
export type UpdateActionItemInput = z.infer<typeof updateActionItemInputSchema>;
export type SearchActionItemsInput = z.infer<typeof searchActionItemsInputSchema>;

// ========== MEETING TRANSCRIPTS ==========
export const meetingTranscriptSchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  speaker: z.string().nullable(),
  content: z.string(),
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export const createMeetingTranscriptInputSchema = z.object({
  meeting_id: z.string(),
  speaker: z.string().optional(),
  content: z.string().min(1),
  timestamp: z.coerce.date()
});

export const searchMeetingTranscriptsInputSchema = z.object({
  meeting_id: z.string().optional(),
  speaker: z.string().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['timestamp', 'created_at']).default('timestamp'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type MeetingTranscript = z.infer<typeof meetingTranscriptSchema>;
export type CreateMeetingTranscriptInput = z.infer<typeof createMeetingTranscriptInputSchema>;
export type SearchMeetingTranscriptsInput = z.infer<typeof searchMeetingTranscriptsInputSchema>;

// ========== MEETING RECORDINGS ==========
export const meetingRecordingSchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  recording_url: z.string().url().nullable(),
  storage_duration: z.number().int(),
  file_size: z.number().int().nullable(),
  created_at: z.coerce.date()
});

export const createMeetingRecordingInputSchema = z.object({
  meeting_id: z.string(),
  recording_url: z.string().url().optional(),
  storage_duration: z.number().int().optional(),
  file_size: z.number().int().optional()
});

export const updateMeetingRecordingInputSchema = z.object({
  id: z.string(),
  recording_url: z.string().url().nullable().optional(),
  storage_duration: z.number().int().optional(),
  file_size: z.number().int().nullable().optional()
});

export type MeetingRecording = z.infer<typeof meetingRecordingSchema>;
export type CreateMeetingRecordingInput = z.infer<typeof createMeetingRecordingInputSchema>;
export type UpdateMeetingRecordingInput = z.infer<typeof updateMeetingRecordingInputSchema>;

// ========== FOLLOW UP EMAILS ==========
export const followUpEmailStatusEnum = z.enum(['draft', 'scheduled', 'sent', 'failed', 'cancelled']);

export const followUpEmailSchema = z.object({
  id: z.string(),
  meeting_id: z.string(),
  template_id: z.string().nullable(),
  recipients: z.string(),
  subject: z.string(),
  body: z.string(),
  scheduled_send_time: z.coerce.date().nullable(),
  sent_at: z.coerce.date().nullable(),
  status: followUpEmailStatusEnum,
  attachments: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createFollowUpEmailInputSchema = z.object({
  meeting_id: z.string(),
  template_id: z.string().optional(),
  recipients: z.string().min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  scheduled_send_time: z.coerce.date().optional(),
  status: followUpEmailStatusEnum.optional(),
  attachments: z.string().optional()
});

export const updateFollowUpEmailInputSchema = z.object({
  id: z.string(),
  template_id: z.string().nullable().optional(),
  recipients: z.string().min(1).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  scheduled_send_time: z.coerce.date().nullable().optional(),
  sent_at: z.coerce.date().optional(),
  status: followUpEmailStatusEnum.optional(),
  attachments: z.string().nullable().optional()
});

export const searchFollowUpEmailsInputSchema = z.object({
  meeting_id: z.string().optional(),
  status: followUpEmailStatusEnum.optional(),
  scheduled_before: z.coerce.date().optional(),
  scheduled_after: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['scheduled_send_time', 'created_at', 'sent_at']).default('scheduled_send_time'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type FollowUpEmail = z.infer<typeof followUpEmailSchema>;
export type CreateFollowUpEmailInput = z.infer<typeof createFollowUpEmailInputSchema>;
export type UpdateFollowUpEmailInput = z.infer<typeof updateFollowUpEmailInputSchema>;
export type SearchFollowUpEmailsInput = z.infer<typeof searchFollowUpEmailsInputSchema>;

// ========== MEETING ANALYTICS ==========
export const meetingAnalyticsSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  total_meeting_time: z.number().int(),
  participation_distribution: z.string().nullable(),
  action_item_completion_rate: z.number().nullable(),
  meeting_sentiment_trends: z.string().nullable(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createMeetingAnalyticsInputSchema = z.object({
  user_id: z.string(),
  total_meeting_time: z.number().int().optional(),
  participation_distribution: z.string().optional(),
  action_item_completion_rate: z.number().optional(),
  meeting_sentiment_trends: z.string().optional(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export const updateMeetingAnalyticsInputSchema = z.object({
  id: z.string(),
  total_meeting_time: z.number().int().optional(),
  participation_distribution: z.string().nullable().optional(),
  action_item_completion_rate: z.number().nullable().optional(),
  meeting_sentiment_trends: z.string().nullable().optional(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional()
});

export const searchMeetingAnalyticsInputSchema = z.object({
  user_id: z.string().optional(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['period_start', 'created_at']).default('period_start'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type MeetingAnalytics = z.infer<typeof meetingAnalyticsSchema>;
export type CreateMeetingAnalyticsInput = z.infer<typeof createMeetingAnalyticsInputSchema>;
export type UpdateMeetingAnalyticsInput = z.infer<typeof updateMeetingAnalyticsInputSchema>;
export type SearchMeetingAnalyticsInput = z.infer<typeof searchMeetingAnalyticsInputSchema>;