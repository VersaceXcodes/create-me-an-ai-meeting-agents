-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS follow_up_emails CASCADE;
DROP TABLE IF EXISTS meeting_recordings CASCADE;
DROP TABLE IF EXISTS meeting_transcripts CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS meeting_summaries CASCADE;
DROP TABLE IF EXISTS meeting_participants CASCADE;
DROP TABLE IF EXISTS meeting_agents CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS ai_agents CASCADE;
DROP TABLE IF EXISTS agent_templates CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS meeting_analytics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(500),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user_preferences table
CREATE TABLE user_preferences (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    push_notifications BOOLEAN NOT NULL DEFAULT true,
    follow_up_reminders BOOLEAN NOT NULL DEFAULT true,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create calendar_integrations table
CREATE TABLE calendar_integrations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_user_id VARCHAR(255),
    email VARCHAR(255),
    access_token VARCHAR(500),
    refresh_token VARCHAR(500),
    is_connected BOOLEAN NOT NULL DEFAULT false,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create ai_agents table
CREATE TABLE ai_agents (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'active',
    participation_level VARCHAR(255) NOT NULL DEFAULT 'observer',
    primary_objectives TEXT NOT NULL,
    voice_settings TEXT,
    custom_instructions TEXT,
    speaking_triggers TEXT,
    note_taking_focus TEXT,
    follow_up_templates TEXT,
    last_used_at VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create agent_templates table
CREATE TABLE agent_templates (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(255) NOT NULL,
    participation_level VARCHAR(255) NOT NULL,
    primary_objectives TEXT NOT NULL,
    voice_settings TEXT,
    custom_instructions TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create meetings table
CREATE TABLE meetings (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time VARCHAR(255) NOT NULL,
    end_time VARCHAR(255) NOT NULL,
    calendar_event_id VARCHAR(255),
    meeting_type VARCHAR(255) NOT NULL,
    agenda TEXT,
    desired_outcomes TEXT,
    special_instructions TEXT,
    status VARCHAR(255) NOT NULL DEFAULT 'scheduled',
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create meeting_agents table
CREATE TABLE meeting_agents (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    join_status VARCHAR(255) NOT NULL DEFAULT 'pending',
    joined_at VARCHAR(255),
    left_at VARCHAR(255),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE
);

-- Create meeting_participants table
CREATE TABLE meeting_participants (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create meeting_summaries table
CREATE TABLE meeting_summaries (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) UNIQUE NOT NULL,
    key_discussion_points TEXT NOT NULL,
    decisions_made TEXT,
    sentiment_analysis TEXT,
    participant_engagement TEXT,
    generated_summary TEXT NOT NULL,
    edited_summary TEXT,
    generated_at VARCHAR(255) NOT NULL,
    edited_at VARCHAR(255),
    is_finalized BOOLEAN NOT NULL DEFAULT false,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create action_items table
CREATE TABLE action_items (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assignee VARCHAR(255) NOT NULL,
    deadline VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'pending',
    comments TEXT,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create meeting_transcripts table
CREATE TABLE meeting_transcripts (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL,
    speaker VARCHAR(255),
    content TEXT NOT NULL,
    timestamp VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create meeting_recordings table
CREATE TABLE meeting_recordings (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL,
    recording_url VARCHAR(500),
    storage_duration INTEGER NOT NULL DEFAULT 30,
    file_size BIGINT,
    created_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create follow_up_emails table
CREATE TABLE follow_up_emails (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL,
    template_id VARCHAR(255),
    recipients TEXT NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    scheduled_send_time VARCHAR(255),
    sent_at VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'draft',
    attachments TEXT,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create meeting_analytics table
CREATE TABLE meeting_analytics (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    total_meeting_time INTEGER NOT NULL DEFAULT 0,
    participation_distribution TEXT,
    action_item_completion_rate NUMERIC(5,2),
    meeting_sentiment_trends TEXT,
    period_start VARCHAR(255) NOT NULL,
    period_end VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed data for users
INSERT INTO users (id, email, full_name, password_hash, profile_picture_url, email_verified, created_at, updated_at, is_active) VALUES
('user_001', 'alice.johnson@example.com', 'Alice Johnson', 'password123', 'https://picsum.photos/seed/alice/200/200', true, '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z', true),
('user_002', 'bob.smith@example.com', 'Bob Smith', 'password123', 'https://picsum.photos/seed/bob/200/200', true, '2024-01-16T09:15:00Z', '2024-01-16T09:15:00Z', true),
('user_003', 'carol.davis@example.com', 'Carol Davis', 'password123', 'https://picsum.photos/seed/carol/200/200', false, '2024-01-17T14:20:00Z', '2024-01-17T14:20:00Z', true),
('user_004', 'david.wilson@example.com', 'David Wilson', 'admin123', 'https://picsum.photos/seed/david/200/200', true, '2024-01-18T11:45:00Z', '2024-01-18T11:45:00Z', true),
('user_005', 'eve.brown@example.com', 'Eve Brown', 'user123', 'https://picsum.photos/seed/eve/200/200', true, '2024-01-19T08:30:00Z', '2024-01-19T08:30:00Z', false);

-- Seed data for password_reset_tokens
INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES
('token_001', 'user_003', 'reset_token_xyz789', '2024-01-20T14:20:00Z'),
('token_002', 'user_001', 'reset_token_abc123', '2024-01-22T10:30:00Z');

-- Seed data for user_preferences
INSERT INTO user_preferences (id, user_id, email_notifications, push_notifications, follow_up_reminders, created_at, updated_at) VALUES
('pref_001', 'user_001', true, false, true, '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z'),
('pref_002', 'user_002', true, true, false, '2024-01-16T09:15:00Z', '2024-01-16T09:15:00Z'),
('pref_003', 'user_003', false, true, true, '2024-01-17T14:20:00Z', '2024-01-17T14:20:00Z'),
('pref_004', 'user_004', true, true, true, '2024-01-18T11:45:00Z', '2024-01-18T11:45:00Z'),
('pref_005', 'user_005', false, false, false, '2024-01-19T08:30:00Z', '2024-01-19T08:30:00Z');

-- Seed data for calendar_integrations
INSERT INTO calendar_integrations (id, user_id, provider, provider_user_id, email, access_token, refresh_token, is_connected, created_at, updated_at) VALUES
('cal_001', 'user_001', 'google', 'google_user_123', 'alice.johnson@example.com', 'access_token_xyz', 'refresh_token_abc', true, '2024-01-15T11:00:00Z', '2024-01-15T11:00:00Z'),
('cal_002', 'user_002', 'outlook', 'outlook_user_456', 'bob.smith@example.com', 'access_token_456', 'refresh_token_789', true, '2024-01-16T09:30:00Z', '2024-01-16T09:30:00Z'),
('cal_003', 'user_004', 'google', 'google_user_789', 'david.wilson@example.com', 'access_token_123', 'refresh_token_xyz', false, '2024-01-18T12:00:00Z', '2024-01-18T12:00:00Z');

-- Seed data for ai_agents
INSERT INTO ai_agents (id, user_id, name, meeting_type, status, participation_level, primary_objectives, voice_settings, custom_instructions, speaking_triggers, note_taking_focus, follow_up_templates, last_used_at, created_at, updated_at) VALUES
('agent_001', 'user_001', 'Project Manager Assistant', 'project_planning', 'active', 'active_participant', 'Track action items, ensure meeting stays on agenda, identify blockers', '{"voice": "professional", "tone": "neutral"}', 'Interrupt when discussion goes off-topic', '["off_topic", "unclear_decision", "action_item_missing"]', 'Technical decisions and resource allocation', '{"follow_up_type": "summary_with_actions"}', '2024-01-20T15:30:00Z', '2024-01-15T12:00:00Z', '2024-01-20T15:30:00Z'),
('agent_002', 'user_002', 'Sales Meeting Analyst', 'sales_review', 'active', 'observer', 'Track sales metrics, identify customer pain points, note objections', '{"voice": "friendly", "tone": "positive"}', 'Take detailed notes on customer feedback', '["customer_feedback", "objection_raised", "competitor_mentioned"]', 'Customer objections and competitive insights', '{"follow_up_type": "sales_summary"}', NULL, '2024-01-16T10:00:00Z', '2024-01-16T10:00:00Z'),
('agent_003', 'user_001', 'Technical Review Specialist', 'technical_review', 'inactive', 'passive_observer', 'Track technical discussions, note architecture decisions, identify technical debt', '{"voice": "technical", "tone": "analytical"}', 'Focus on technical implementation details', '["architecture_decision", "technical_debt", "performance_concern"]', 'Technical specifications and implementation details', NULL, NULL, '2024-01-17T13:00:00Z', '2024-01-17T13:00:00Z');

-- Seed data for agent_templates
INSERT INTO agent_templates (id, user_id, name, meeting_type, participation_level, primary_objectives, voice_settings, custom_instructions, is_public, created_at, updated_at) VALUES
('template_001', 'user_001', 'Standard Project Meeting', 'project_planning', 'active_participant', 'Track action items, ensure agenda adherence, identify blockers', '{"voice": "professional", "tone": "neutral"}', 'Keep meetings focused on agenda items', false, '2024-01-15T14:00:00Z', '2024-01-15T14:00:00Z'),
('template_002', 'user_002', 'Sales Performance Review', 'sales_review', 'observer', 'Track metrics, identify opportunities, note customer feedback', '{"voice": "friendly", "tone": "positive"}', 'Focus on customer insights and sales opportunities', true, '2024-01-16T11:00:00Z', '2024-01-16T11:00:00Z'),
('template_003', 'user_004', 'Executive Briefing', 'executive', 'passive_observer', 'Track strategic decisions, note resource allocation, identify risks', '{"voice": "executive", "tone": "authoritative"}', 'Focus on high-level strategy and business impact', false, '2024-01-18T13:00:00Z', '2024-01-18T13:00:00Z');

-- Seed data for meetings
INSERT INTO meetings (id, user_id, title, description, start_time, end_time, calendar_event_id, meeting_type, agenda, desired_outcomes, special_instructions, status, created_at, updated_at) VALUES
('meeting_001', 'user_001', 'Q1 Project Planning Session', 'Quarterly planning for all ongoing projects', '2024-01-20T14:00:00Z', '2024-01-20T15:30:00Z', 'cal_event_001', 'project_planning', '1. Review Q4 performance\n2. Set Q1 goals\n3. Resource allocation\n4. Risk assessment', 'Clear project roadmap for Q1, Assigned action items, Identified risks and mitigation plans', 'Please ensure all department leads are present', 'completed', '2024-01-18T09:00:00Z', '2024-01-20T15:30:00Z'),
('meeting_002', 'user_002', 'Monthly Sales Review', 'Review January sales performance and set February targets', '2024-01-22T10:00:00Z', '2024-01-22T11:00:00Z', 'cal_event_002', 'sales_review', '1. January performance review\n2. Pipeline analysis\n3. Target setting for February\n4. Training needs', 'Updated sales targets, Identified training opportunities, Action plan for pipeline growth', 'Have CRM reports ready', 'scheduled', '2024-01-19T14:00:00Z', '2024-01-19T14:00:00Z'),
('meeting_003', 'user_001', 'Product Launch Retrospective', 'Post-mortem for recent product launch', '2024-01-25T13:00:00Z', '2024-01-25T14:30:00Z', 'cal_event_003', 'retrospective', '1. What went well\n2. What could be improved\n3. Lessons learned\n4. Next steps', 'Documented lessons learned, Improvement plan for next launch, Team feedback incorporated', 'Focus on actionable improvements', 'cancelled', '2024-01-20T11:00:00Z', '2024-01-21T09:00:00Z');

-- Seed data for meeting_agents
INSERT INTO meeting_agents (id, meeting_id, agent_id, join_status, joined_at, left_at) VALUES
('ma_001', 'meeting_001', 'agent_001', 'joined', '2024-01-20T14:00:00Z', '2024-01-20T15:30:00Z'),
('ma_002', 'meeting_002', 'agent_002', 'pending', NULL, NULL),
('ma_003', 'meeting_001', 'agent_003', 'declined', NULL, NULL);

-- Seed data for meeting_participants
INSERT INTO meeting_participants (id, meeting_id, name, email, role, created_at) VALUES
('mp_001', 'meeting_001', 'John Doe', 'john.doe@example.com', 'Project Manager', '2024-01-18T09:00:00Z'),
('mp_002', 'meeting_001', 'Jane Smith', 'jane.smith@example.com', 'Tech Lead', '2024-01-18T09:00:00Z'),
('mp_003', 'meeting_002', 'Mike Johnson', 'mike.johnson@example.com', 'Sales Director', '2024-01-19T14:00:00Z'),
('mp_004', 'meeting_002', 'Sarah Wilson', 'sarah.wilson@example.com', 'Account Executive', '2024-01-19T14:00:00Z'),
('mp_005', 'meeting_001', 'Emily Brown', 'emily.brown@example.com', 'Product Manager', '2024-01-18T09:00:00Z');

-- Seed data for meeting_summaries
INSERT INTO meeting_summaries (id, meeting_id, key_discussion_points, decisions_made, sentiment_analysis, participant_engagement, generated_summary, edited_summary, generated_at, edited_at, is_finalized, created_at, updated_at) VALUES
('summary_001', 'meeting_001', '1. Project timelines reviewed\n2. Resource constraints discussed\n3. Risk mitigation strategies', '1. Extend Project Alpha deadline by 2 weeks\n2. Hire 2 additional developers\n3. Schedule weekly status meetings', '{"overall": "positive", "key_moments": [{"time": "14:15", "sentiment": "concerned"}, {"time": "14:45", "sentiment": "optimistic"}]', '{"John_Doe": "high", "Jane_Smith": "medium", "Emily_Brown": "high"}', 'The team reviewed Q4 performance and set clear goals for Q1. Key decisions include extending Project Alpha''s timeline and hiring additional resources.', 'Added specific timeline details and clarified resource allocation.', '2024-01-20T15:35:00Z', '2024-01-20T16:00:00Z', true, '2024-01-20T15:35:00Z', '2024-01-20T16:00:00Z');

-- Seed data for action_items
INSERT INTO action_items (id, meeting_id, description, assignee, deadline, status, comments, created_at, updated_at) VALUES
('action_001', 'meeting_001', 'Update project timeline with new deadlines', 'John Doe', '2024-01-27T17:00:00Z', 'completed', 'Timeline submitted and approved', '2024-01-20T15:30:00Z', '2024-01-21T09:00:00Z'),
('action_002', 'meeting_001', 'Post job openings for developer positions', 'Jane Smith', '2024-02-15T17:00:00Z', 'in_progress', 'Two positions posted', '2024-01-20T15:30:00Z'),
('action_003', 'meeting_002', 'Prepare sales training materials for new team members', 'Mike Johnson', '2024-02-01T17:00:00Z', 'pending', 'Materials in draft stage', '2024-01-19T14:00:00Z');

-- Seed data for meeting_transcripts
INSERT INTO meeting_transcripts (id, meeting_id, speaker, content, timestamp, created_at) VALUES
('transcript_001', 'meeting_001', 'John Doe', 'Let''s start by reviewing the Q4 performance metrics.', '2024-01-20T14:00:05Z', '2024-01-20T14:00:05Z'),
('transcript_002', 'meeting_001', 'Jane Smith', 'The engineering team exceeded our delivery targets by 15%.', '2024-01-20T14:02:30Z', '2024-01-20T14:02:30Z'),
('transcript_003', 'meeting_001', 'Emily Brown', 'We need to address the resource constraints we''re facing.', '2024-01-20T14:15:45Z', '2024-01-20T14:15:45Z');

-- Seed data for meeting_recordings
INSERT INTO meeting_recordings (id, meeting_id, recording_url, storage_duration, file_size, created_at) VALUES
('recording_001', 'meeting_001', 'https://picsum.photos/seed/recording001/800/600', 30, 157286400, '2024-01-20T15:30:00Z'),
('recording_002', 'meeting_002', 'https://picsum.photos/seed/recording002/800/600', 30, 209715200, '2024-01-19T14:00:00Z');

-- Seed data for follow_up_emails
INSERT INTO follow_up_emails (id, meeting_id, template_id, recipients, subject, body, scheduled_send_time, sent_at, status, attachments, created_at, updated_at) VALUES
('email_001', 'meeting_001', 'template_001', 'john.doe@example.com,jane.smith@example.com,emily.brown@example.com', 'Q1 Project Planning Meeting Summary', 'Dear team,\n\nThank you for attending the Q1 planning session. Key decisions included extending Project Alpha timeline and hiring additional developers.', '2024-01-20T16:00:00Z', '2024-01-20T16:00:00Z', 'sent', 'summary.pdf,action_items.xlsx', '2024-01-20T15:40:00Z', '2024-01-20T16:00:00Z'),
('email_002', 'meeting_002', 'template_002', 'mike.johnson@example.com,sarah.wilson@example.com', 'January Sales Review Follow-up', 'Hi team,\n\nHere are the action items from our January sales review meeting.', NULL, NULL, 'draft', NULL, '2024-01-19T14:00:00Z', '2024-01-19T14:00:00Z');

-- Seed data for meeting_analytics
INSERT INTO meeting_analytics (id, user_id, total_meeting_time, participation_distribution, action_item_completion_rate, meeting_sentiment_trends, period_start, period_end, created_at, updated_at) VALUES
('analytics_001', 'user_001', 90, '{"participant_1": 40, "participant_2": 30, "participant_3": 20}', 75.50, '{"positive": 65, "neutral": 25, "negative": 10}', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', '2024-01-31T17:00:00Z', '2024-01-31T17:00:00Z'),
('analytics_002', 'user_002', 60, '{"participant_1": 50, "participant_2": 30, "participant_3": 20}', 60.00, '{"positive": 50, "neutral": 35, "negative": 15}', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', '2024-01-31T17:00:00Z', '2024-01-31T17:00:00Z');