import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';

// Import Zod schemas
import {
  userSchema, createUserInputSchema, updateUserInputSchema, searchUsersInputSchema,
  passwordResetTokenSchema, createPasswordResetTokenInputSchema,
  userPreferencesSchema, createUserPreferencesInputSchema, updateUserPreferencesInputSchema,
  calendarIntegrationSchema, createCalendarIntegrationInputSchema, updateCalendarIntegrationInputSchema, searchCalendarIntegrationsInputSchema,
  aiAgentSchema, createAiAgentInputSchema, updateAiAgentInputSchema, searchAiAgentsInputSchema,
  agentTemplateSchema, createAgentTemplateInputSchema, updateAgentTemplateInputSchema, searchAgentTemplatesInputSchema,
  meetingSchema, createMeetingInputSchema, updateMeetingInputSchema, searchMeetingsInputSchema,
  meetingAgentSchema, createMeetingAgentInputSchema, updateMeetingAgentInputSchema,
  meetingParticipantSchema, createMeetingParticipantInputSchema, updateMeetingParticipantInputSchema, searchMeetingParticipantsInputSchema,
  meetingSummarySchema, createMeetingSummaryInputSchema, updateMeetingSummaryInputSchema,
  actionItemSchema, createActionItemInputSchema, updateActionItemInputSchema, searchActionItemsInputSchema,
  meetingTranscriptSchema, createMeetingTranscriptInputSchema, searchMeetingTranscriptsInputSchema,
  meetingRecordingSchema, createMeetingRecordingInputSchema, updateMeetingRecordingInputSchema,
  followUpEmailSchema, createFollowUpEmailInputSchema, updateFollowUpEmailInputSchema, searchFollowUpEmailsInputSchema,
  meetingAnalyticsSchema, createMeetingAnalyticsInputSchema, updateMeetingAnalyticsInputSchema, searchMeetingAnalyticsInputSchema
} from './schema.ts';

dotenv.config();

// Error response utility
interface ErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: any;
  timestamp: string;
}

function createErrorResponse(
  message: string,
  error?: any,
  errorCode?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.error_code = errorCode;
  }

  if (error) {
    response.details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return response;
}

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'your-secret-key' } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { require: true },
      }
);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }
});

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: "5mb" }));
app.use(morgan('combined'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware for protected routes
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_REQUIRED'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, email, full_name, profile_picture_url, email_verified, created_at, updated_at, is_active FROM users WHERE id = $1', [decoded.user_id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID'));
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID'));
  }
};

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, email, full_name FROM users WHERE id = $1', [decoded.user_id]);
    
    if (result.rows.length === 0) {
      return next(new Error('Authentication error'));
    }

    socket.user = result.rows[0];
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

/*
@need:external-api: Calendar integration service (Google Calendar/Outlook API) to sync events and manage calendar data
This function should integrate with external calendar APIs to fetch events, create meetings, and sync calendar data.
For now, returning mock calendar events that match the expected response format.
*/
async function fetchCalendarEvents({ user_id, provider, date_range }) {
  // Mock calendar events for development
  return {
    events: [
      {
        id: `cal_event_${Date.now()}`,
        title: 'Team Standup',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        attendees: ['john@example.com', 'jane@example.com']
      },
      {
        id: `cal_event_${Date.now() + 1}`,
        title: 'Client Review Meeting',
        start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
        attendees: ['client@example.com']
      }
    ],
    sync_status: 'successful',
    last_sync: new Date().toISOString()
  };
}

/*
@need:external-api: AI transcription service (speech-to-text) to convert meeting audio to text in real-time
This function should integrate with AI services like OpenAI Whisper, Google Speech-to-Text, or similar services.
For now, returning mock transcription data that matches the expected response format.
*/
async function transcribeAudio({ audio_chunk, meeting_id, timestamp }) {
  // Mock transcription for development
  const mockSpeakers = ['John Doe', 'Jane Smith', 'AI Agent', 'Mike Johnson'];
  const mockContent = [
    'Let\'s start with the project updates.',
    'The backend implementation is progressing well.',
    'We need to discuss the upcoming deadline.',
    'The client feedback has been positive so far.',
    'Are there any blockers we need to address?'
  ];

  return {
    transcript_id: uuidv4(),
    speaker: mockSpeakers[Math.floor(Math.random() * mockSpeakers.length)],
    content: mockContent[Math.floor(Math.random() * mockContent.length)],
    confidence: 0.95,
    timestamp: new Date().toISOString()
  };
}

/*
@need:external-api: AI summary generation service to create intelligent meeting summaries
This function should integrate with AI services like OpenAI GPT, Claude, or similar NLP services.
For now, returning mock summary data that matches the expected response format.
*/
async function generateMeetingSummary({ meeting_id, transcripts, participants }) {
  // Mock summary generation for development
  return {
    key_discussion_points: '1. Project timeline review\n2. Resource allocation discussion\n3. Client feedback analysis\n4. Next milestone planning',
    decisions_made: '1. Extend project deadline by 2 weeks\n2. Hire additional developer\n3. Schedule weekly client check-ins',
    sentiment_analysis: '{"overall": "positive", "key_moments": [{"time": "10:15", "sentiment": "concerned"}, {"time": "10:45", "sentiment": "optimistic"}]}',
    participant_engagement: '{"John_Doe": "high", "Jane_Smith": "medium", "Mike_Johnson": "high"}',
    generated_summary: 'The team reviewed project progress and made key decisions regarding timeline and resources. Overall positive sentiment with strong engagement from participants.',
    processing_time: 2.5
  };
}

/*
@need:external-api: Email delivery service (SendGrid, Mailgun, etc.) to send follow-up emails
This function should integrate with email services to send follow-up emails with meeting summaries and action items.
For now, returning mock email delivery status that matches the expected response format.
*/
async function sendFollowUpEmail({ email_id, recipients, subject, body, attachments }) {
  // Mock email sending for development
  return {
    email_id,
    delivery_status: 'sent',
    sent_at: new Date().toISOString(),
    recipient_count: recipients.split(',').length,
    message_id: `msg_${Date.now()}`
  };
}

/*
@need:external-api: AI agent participation service to simulate intelligent agent responses during meetings
This function should integrate with AI services to generate contextual agent responses based on meeting content.
For now, returning mock agent responses that match the expected response format.
*/
async function generateAgentResponse({ agent_id, meeting_context, trigger_type }) {
  // Mock agent response for development
  const responses = [
    'I noticed we have an action item without a clear deadline. Should we set a specific date?',
    'Based on the discussion, it seems like we need to prioritize the technical review.',
    'Let me summarize the key points discussed so far for clarity.',
    'I can help track the action items mentioned in this discussion.'
  ];

  return {
    response_text: responses[Math.floor(Math.random() * responses.length)],
    confidence: 0.87,
    response_type: 'suggestion',
    timestamp: new Date().toISOString()
  };
}

// ========== AUTHENTICATION ENDPOINTS ==========

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const validatedData = createUserInputSchema.parse({
      email: req.body.email,
      full_name: req.body.full_name,
      password_hash: req.body.password, // Store password directly for development
      profile_picture_url: req.body.profile_picture_url,
      email_verified: false,
      is_active: true
    });

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [validatedData.email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json(createErrorResponse('User with this email already exists', null, 'USER_ALREADY_EXISTS'));
    }

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO users (id, email, full_name, password_hash, profile_picture_url, email_verified, created_at, updated_at, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, full_name, profile_picture_url, email_verified, created_at, updated_at, is_active',
      [userId, validatedData.email.toLowerCase(), validatedData.full_name, validatedData.password_hash, validatedData.profile_picture_url, validatedData.email_verified, now, now, validatedData.is_active]
    );

    const user = result.rows[0];

    // Create default user preferences
    const preferencesId = uuidv4();
    await pool.query(
      'INSERT INTO user_preferences (id, user_id, email_notifications, push_notifications, follow_up_reminders, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [preferencesId, userId, true, true, true, now, now]
    );

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user,
      auth_token: token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(createErrorResponse('Email and password are required', null, 'MISSING_REQUIRED_FIELDS'));
    }

    // Find user and validate password (direct comparison for development)
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0 || result.rows[0].password_hash !== password) {
      return res.status(401).json(createErrorResponse('Invalid email or password', null, 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];
    delete user.password_hash; // Remove password from response

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      user,
      auth_token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Password reset request endpoint
app.post('/api/auth/password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(createErrorResponse('Email is required', null, 'MISSING_REQUIRED_FIELDS'));
    }

    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }

    // Create password reset token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    
    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), userResult.rows[0].id, token, expiresAt]
    );

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Password reset with token endpoint
app.post('/api/auth/password-reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json(createErrorResponse('Password must be at least 8 characters long', null, 'PASSWORD_TOO_SHORT'));
    }

    // Verify token
    const tokenResult = await pool.query('SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > $2', [token, new Date().toISOString()]);
    if (tokenResult.rows.length === 0) {
      return res.status(400).json(createErrorResponse('Invalid or expired token', null, 'INVALID_TOKEN'));
    }

    // Update password
    await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [new_password, new Date().toISOString(), tokenResult.rows[0].user_id]);

    // Delete used token
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== USER MANAGEMENT ENDPOINTS ==========

// Get current user endpoint
app.get('/api/users/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Update current user endpoint
app.put('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const validatedData = updateUserInputSchema.parse({
      id: req.user.id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (validatedData.full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      updateValues.push(validatedData.full_name);
    }

    if (validatedData.profile_picture_url !== undefined) {
      updateFields.push(`profile_picture_url = $${paramIndex++}`);
      updateValues.push(validatedData.profile_picture_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES'));
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, profile_picture_url, email_verified, created_at, updated_at, is_active`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get user preferences endpoint
app.get('/api/users/me/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User preferences not found', null, 'PREFERENCES_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update user preferences endpoint
app.put('/api/users/me/preferences', authenticateToken, async (req, res) => {
  try {
    const preferencesResult = await pool.query('SELECT id FROM user_preferences WHERE user_id = $1', [req.user.id]);
    
    if (preferencesResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User preferences not found', null, 'PREFERENCES_NOT_FOUND'));
    }

    const validatedData = updateUserPreferencesInputSchema.parse({
      id: preferencesResult.rows[0].id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (validatedData.email_notifications !== undefined) {
      updateFields.push(`email_notifications = $${paramIndex++}`);
      updateValues.push(validatedData.email_notifications);
    }

    if (validatedData.push_notifications !== undefined) {
      updateFields.push(`push_notifications = $${paramIndex++}`);
      updateValues.push(validatedData.push_notifications);
    }

    if (validatedData.follow_up_reminders !== undefined) {
      updateFields.push(`follow_up_reminders = $${paramIndex++}`);
      updateValues.push(validatedData.follow_up_reminders);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(validatedData.id);

    const result = await pool.query(
      `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preferences error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Change password endpoint
app.put('/api/users/me/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json(createErrorResponse('Current password and new password are required', null, 'MISSING_REQUIRED_FIELDS'));
    }

    if (new_password.length < 8) {
      return res.status(400).json(createErrorResponse('New password must be at least 8 characters long', null, 'PASSWORD_TOO_SHORT'));
    }

    // Verify current password
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows[0].password_hash !== current_password) {
      return res.status(401).json(createErrorResponse('Current password is incorrect', null, 'INVALID_CURRENT_PASSWORD'));
    }

    // Update password
    await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [new_password, new Date().toISOString(), req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== CALENDAR INTEGRATION ENDPOINTS ==========

// Get calendar integrations endpoint
app.get('/api/integrations/calendar', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM calendar_integrations WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get calendar integrations error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Create calendar integration endpoint
app.post('/api/integrations/calendar', authenticateToken, async (req, res) => {
  try {
    const validatedData = createCalendarIntegrationInputSchema.parse({
      user_id: req.user.id,
      ...req.body
    });

    const integrationId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO calendar_integrations (id, user_id, provider, provider_user_id, email, access_token, refresh_token, is_connected, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [integrationId, validatedData.user_id, validatedData.provider, validatedData.provider_user_id, validatedData.email, validatedData.access_token, validatedData.refresh_token, validatedData.is_connected || false, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create calendar integration error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update calendar integration endpoint
app.put('/api/integrations/calendar/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const ownershipResult = await pool.query('SELECT id FROM calendar_integrations WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Calendar integration not found', null, 'INTEGRATION_NOT_FOUND'));
    }

    const validatedData = updateCalendarIntegrationInputSchema.parse({
      id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE calendar_integrations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update calendar integration error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Delete calendar integration endpoint
app.delete('/api/integrations/calendar/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM calendar_integrations WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json(createErrorResponse('Calendar integration not found', null, 'INTEGRATION_NOT_FOUND'));
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete calendar integration error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== AI AGENT ENDPOINTS ==========

// Search and list AI agents endpoint
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const validatedQuery = searchAiAgentsInputSchema.parse({
      user_id: req.user.id,
      ...req.query
    });

    let queryStr = 'SELECT * FROM ai_agents WHERE user_id = $1';
    const queryParams = [req.user.id];
    let paramIndex = 2;

    if (validatedQuery.meeting_type) {
      queryStr += ` AND meeting_type = $${paramIndex++}`;
      queryParams.push(validatedQuery.meeting_type);
    }

    if (validatedQuery.status) {
      queryStr += ` AND status = $${paramIndex++}`;
      queryParams.push(validatedQuery.status);
    }

    if (validatedQuery.participation_level) {
      queryStr += ` AND participation_level = $${paramIndex++}`;
      queryParams.push(validatedQuery.participation_level);
    }

    queryStr += ` ORDER BY ${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM ai_agents WHERE user_id = $1';
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (validatedQuery.meeting_type) {
      countQueryStr += ` AND meeting_type = $${countParamIndex++}`;
      countParams.push(validatedQuery.meeting_type);
    }

    if (validatedQuery.status) {
      countQueryStr += ` AND status = $${countParamIndex++}`;
      countParams.push(validatedQuery.status);
    }

    if (validatedQuery.participation_level) {
      countQueryStr += ` AND participation_level = $${countParamIndex++}`;
      countParams.push(validatedQuery.participation_level);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      agents: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Search agents error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Create AI agent endpoint
app.post('/api/agents', authenticateToken, async (req, res) => {
  try {
    const validatedData = createAiAgentInputSchema.parse({
      user_id: req.user.id,
      ...req.body
    });

    const agentId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO ai_agents (id, user_id, name, meeting_type, status, participation_level, primary_objectives, voice_settings, custom_instructions, speaking_triggers, note_taking_focus, follow_up_templates, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [agentId, validatedData.user_id, validatedData.name, validatedData.meeting_type, validatedData.status || 'active', validatedData.participation_level || 'observer', validatedData.primary_objectives, validatedData.voice_settings, validatedData.custom_instructions, validatedData.speaking_triggers, validatedData.note_taking_focus, validatedData.follow_up_templates, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create agent error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get AI agent by ID endpoint
app.get('/api/agents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update AI agent endpoint
app.put('/api/agents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const ownershipResult = await pool.query('SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    const validatedData = updateAiAgentInputSchema.parse({
      id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE ai_agents SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update agent error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Delete AI agent endpoint
app.delete('/api/agents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM ai_agents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Duplicate AI agent endpoint
app.post('/api/agents/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    const originalAgent = result.rows[0];
    const newAgentId = uuidv4();
    const now = new Date().toISOString();

    const duplicateResult = await pool.query(
      'INSERT INTO ai_agents (id, user_id, name, meeting_type, status, participation_level, primary_objectives, voice_settings, custom_instructions, speaking_triggers, note_taking_focus, follow_up_templates, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [newAgentId, originalAgent.user_id, `${originalAgent.name} (Copy)`, originalAgent.meeting_type, originalAgent.status, originalAgent.participation_level, originalAgent.primary_objectives, originalAgent.voice_settings, originalAgent.custom_instructions, originalAgent.speaking_triggers, originalAgent.note_taking_focus, originalAgent.follow_up_templates, now, now]
    );

    res.status(201).json(duplicateResult.rows[0]);
  } catch (error) {
    console.error('Duplicate agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Archive AI agent endpoint
app.post('/api/agents/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('UPDATE ai_agents SET status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4 RETURNING *', ['inactive', new Date().toISOString(), id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Archive agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Restore AI agent endpoint
app.post('/api/agents/:id/restore', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('UPDATE ai_agents SET status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4 RETURNING *', ['active', new Date().toISOString(), id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Restore agent error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== AGENT TEMPLATE ENDPOINTS ==========

// Search and list agent templates endpoint
app.get('/api/agent-templates', authenticateToken, async (req, res) => {
  try {
    const validatedQuery = searchAgentTemplatesInputSchema.parse(req.query);

    let queryStr = 'SELECT * FROM agent_templates WHERE (user_id = $1 OR is_public = true)';
    const queryParams = [req.user.id];
    let paramIndex = 2;

    if (validatedQuery.meeting_type) {
      queryStr += ` AND meeting_type = $${paramIndex++}`;
      queryParams.push(validatedQuery.meeting_type);
    }

    if (validatedQuery.participation_level) {
      queryStr += ` AND participation_level = $${paramIndex++}`;
      queryParams.push(validatedQuery.participation_level);
    }

    if (validatedQuery.is_public !== undefined) {
      queryStr += ` AND is_public = $${paramIndex++}`;
      queryParams.push(validatedQuery.is_public);
    }

    queryStr += ` ORDER BY ${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM agent_templates WHERE (user_id = $1 OR is_public = true)';
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (validatedQuery.meeting_type) {
      countQueryStr += ` AND meeting_type = $${countParamIndex++}`;
      countParams.push(validatedQuery.meeting_type);
    }

    if (validatedQuery.participation_level) {
      countQueryStr += ` AND participation_level = $${countParamIndex++}`;
      countParams.push(validatedQuery.participation_level);
    }

    if (validatedQuery.is_public !== undefined) {
      countQueryStr += ` AND is_public = $${countParamIndex++}`;
      countParams.push(validatedQuery.is_public);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      templates: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Search agent templates error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Create agent template endpoint
app.post('/api/agent-templates', authenticateToken, async (req, res) => {
  try {
    const validatedData = createAgentTemplateInputSchema.parse({
      user_id: req.user.id,
      ...req.body
    });

    const templateId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO agent_templates (id, user_id, name, meeting_type, participation_level, primary_objectives, voice_settings, custom_instructions, is_public, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [templateId, validatedData.user_id, validatedData.name, validatedData.meeting_type, validatedData.participation_level, validatedData.primary_objectives, validatedData.voice_settings, validatedData.custom_instructions, validatedData.is_public || false, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create agent template error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get agent template by ID endpoint
app.get('/api/agent-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM agent_templates WHERE id = $1 AND (user_id = $2 OR is_public = true)', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent template not found', null, 'TEMPLATE_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get agent template error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update agent template endpoint
app.put('/api/agent-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership (only creator can update)
    const ownershipResult = await pool.query('SELECT id FROM agent_templates WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent template not found', null, 'TEMPLATE_NOT_FOUND'));
    }

    const validatedData = updateAgentTemplateInputSchema.parse({
      id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE agent_templates SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update agent template error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Delete agent template endpoint
app.delete('/api/agent-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM agent_templates WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json(createErrorResponse('Agent template not found', null, 'TEMPLATE_NOT_FOUND'));
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete agent template error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== MEETING ENDPOINTS ==========

// Search and list meetings endpoint
app.get('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const validatedQuery = searchMeetingsInputSchema.parse({
      user_id: req.user.id,
      ...req.query
    });

    let queryStr = 'SELECT * FROM meetings WHERE user_id = $1';
    const queryParams = [req.user.id];
    let paramIndex = 2;

    if (validatedQuery.meeting_type) {
      queryStr += ` AND meeting_type = $${paramIndex++}`;
      queryParams.push(validatedQuery.meeting_type);
    }

    if (validatedQuery.status) {
      queryStr += ` AND status = $${paramIndex++}`;
      queryParams.push(validatedQuery.status);
    }

    if (validatedQuery.start_date) {
      queryStr += ` AND start_time >= $${paramIndex++}`;
      queryParams.push(validatedQuery.start_date);
    }

    if (validatedQuery.end_date) {
      queryStr += ` AND end_time <= $${paramIndex++}`;
      queryParams.push(validatedQuery.end_date);
    }

    if (req.query.agent_id) {
      queryStr += ` AND id IN (SELECT meeting_id FROM meeting_agents WHERE agent_id = $${paramIndex++})`;
      queryParams.push(req.query.agent_id);
    }

    queryStr += ` ORDER BY ${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM meetings WHERE user_id = $1';
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (validatedQuery.meeting_type) {
      countQueryStr += ` AND meeting_type = $${countParamIndex++}`;
      countParams.push(validatedQuery.meeting_type);
    }

    if (validatedQuery.status) {
      countQueryStr += ` AND status = $${countParamIndex++}`;
      countParams.push(validatedQuery.status);
    }

    if (validatedQuery.start_date) {
      countQueryStr += ` AND start_time >= $${countParamIndex++}`;
      countParams.push(validatedQuery.start_date);
    }

    if (validatedQuery.end_date) {
      countQueryStr += ` AND end_time <= $${countParamIndex++}`;
      countParams.push(validatedQuery.end_date);
    }

    if (req.query.agent_id) {
      countQueryStr += ` AND id IN (SELECT meeting_id FROM meeting_agents WHERE agent_id = $${countParamIndex++})`;
      countParams.push(req.query.agent_id);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      meetings: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Search meetings error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Create meeting endpoint
app.post('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const validatedData = createMeetingInputSchema.parse({
      user_id: req.user.id,
      ...req.body
    });

    const meetingId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO meetings (id, user_id, title, description, start_time, end_time, calendar_event_id, meeting_type, agenda, desired_outcomes, special_instructions, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [meetingId, validatedData.user_id, validatedData.title, validatedData.description, validatedData.start_time, validatedData.end_time, validatedData.calendar_event_id, validatedData.meeting_type, validatedData.agenda, validatedData.desired_outcomes, validatedData.special_instructions, validatedData.status || 'scheduled', now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create meeting error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get meeting by ID endpoint
app.get('/api/meetings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update meeting endpoint
app.put('/api/meetings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const ownershipResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const validatedData = updateMeetingInputSchema.parse({
      id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE meetings SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update meeting error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Delete meeting endpoint
app.delete('/api/meetings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Assign agent to meeting endpoint
app.post('/api/meetings/:id/assign-agent', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json(createErrorResponse('Agent ID is required', null, 'MISSING_AGENT_ID'));
    }

    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    // Verify agent ownership
    const agentResult = await pool.query('SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2', [agent_id, req.user.id]);
    if (agentResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Agent not found', null, 'AGENT_NOT_FOUND'));
    }

    // Check if agent is already assigned
    const existingAssignment = await pool.query('SELECT id FROM meeting_agents WHERE meeting_id = $1 AND agent_id = $2', [id, agent_id]);
    if (existingAssignment.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Agent is already assigned to this meeting', null, 'AGENT_ALREADY_ASSIGNED'));
    }

    const meetingAgentId = uuidv4();
    const result = await pool.query(
      'INSERT INTO meeting_agents (id, meeting_id, agent_id, join_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [meetingAgentId, id, agent_id, 'pending']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Assign agent to meeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get meeting participants endpoint
app.get('/api/meetings/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const validatedQuery = searchMeetingParticipantsInputSchema.parse({
      meeting_id: id,
      ...req.query
    });

    let queryStr = 'SELECT * FROM meeting_participants WHERE meeting_id = $1';
    const queryParams = [id];
    let paramIndex = 2;

    if (validatedQuery.email) {
      queryStr += ` AND email = $${paramIndex++}`;
      queryParams.push(validatedQuery.email);
    }

    queryStr += ` ORDER BY created_at DESC`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = $1';
    const countParams = [id];
    let countParamIndex = 2;

    if (validatedQuery.email) {
      countQueryStr += ` AND email = $${countParamIndex++}`;
      countParams.push(validatedQuery.email);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      participants: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get meeting participants error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Add participant to meeting endpoint
app.post('/api/meetings/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const validatedData = createMeetingParticipantInputSchema.parse({
      meeting_id: id,
      ...req.body
    });

    const participantId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO meeting_participants (id, meeting_id, name, email, role, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [participantId, validatedData.meeting_id, validatedData.name, validatedData.email, validatedData.role, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add meeting participant error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get meeting summary endpoint
app.get('/api/meetings/:id/summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const result = await pool.query('SELECT * FROM meeting_summaries WHERE meeting_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting summary not found', null, 'SUMMARY_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get meeting summary error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update meeting summary endpoint
app.put('/api/meetings/:id/summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    // Check if summary exists
    const summaryResult = await pool.query('SELECT id FROM meeting_summaries WHERE meeting_id = $1', [id]);
    if (summaryResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting summary not found', null, 'SUMMARY_NOT_FOUND'));
    }

    const validatedData = updateMeetingSummaryInputSchema.parse({
      id: summaryResult.rows[0].id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    if (req.body.edited_summary) {
      updateFields.push(`edited_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(validatedData.id);

    const result = await pool.query(
      `UPDATE meeting_summaries SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update meeting summary error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get meeting transcripts endpoint
app.get('/api/meetings/:id/transcripts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const validatedQuery = searchMeetingTranscriptsInputSchema.parse({
      meeting_id: id,
      ...req.query
    });

    let queryStr = 'SELECT * FROM meeting_transcripts WHERE meeting_id = $1';
    const queryParams = [id];
    let paramIndex = 2;

    if (validatedQuery.speaker) {
      queryStr += ` AND speaker = $${paramIndex++}`;
      queryParams.push(validatedQuery.speaker);
    }

    if (validatedQuery.start_time) {
      queryStr += ` AND timestamp >= $${paramIndex++}`;
      queryParams.push(validatedQuery.start_time);
    }

    if (validatedQuery.end_time) {
      queryStr += ` AND timestamp <= $${paramIndex++}`;
      queryParams.push(validatedQuery.end_time);
    }

    queryStr += ` ORDER BY ${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM meeting_transcripts WHERE meeting_id = $1';
    const countParams = [id];
    let countParamIndex = 2;

    if (validatedQuery.speaker) {
      countQueryStr += ` AND speaker = $${countParamIndex++}`;
      countParams.push(validatedQuery.speaker);
    }

    if (validatedQuery.start_time) {
      countQueryStr += ` AND timestamp >= $${countParamIndex++}`;
      countParams.push(validatedQuery.start_time);
    }

    if (validatedQuery.end_time) {
      countQueryStr += ` AND timestamp <= $${countParamIndex++}`;
      countParams.push(validatedQuery.end_time);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      transcripts: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get meeting transcripts error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get meeting recording endpoint
app.get('/api/meetings/:id/recording', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const result = await pool.query('SELECT * FROM meeting_recordings WHERE meeting_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting recording not found', null, 'RECORDING_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get meeting recording error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update meeting recording endpoint
app.put('/api/meetings/:id/recording', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    // Check if recording exists
    const recordingResult = await pool.query('SELECT id FROM meeting_recordings WHERE meeting_id = $1', [id]);
    if (recordingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting recording not found', null, 'RECORDING_NOT_FOUND'));
    }

    const validatedData = updateMeetingRecordingInputSchema.parse({
      id: recordingResult.rows[0].id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES'));
    }

    updateValues.push(validatedData.id);

    const result = await pool.query(
      `UPDATE meeting_recordings SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update meeting recording error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== ACTION ITEM ENDPOINTS ==========

// Search and list action items endpoint
app.get('/api/action-items', authenticateToken, async (req, res) => {
  try {
    const validatedQuery = searchActionItemsInputSchema.parse(req.query);

    // Build query to get action items for meetings owned by the user
    let queryStr = 'SELECT ai.* FROM action_items ai INNER JOIN meetings m ON ai.meeting_id = m.id WHERE m.user_id = $1';
    const queryParams = [req.user.id];
    let paramIndex = 2;

    if (validatedQuery.meeting_id) {
      queryStr += ` AND ai.meeting_id = $${paramIndex++}`;
      queryParams.push(validatedQuery.meeting_id);
    }

    if (validatedQuery.assignee) {
      queryStr += ` AND ai.assignee = $${paramIndex++}`;
      queryParams.push(validatedQuery.assignee);
    }

    if (validatedQuery.status) {
      queryStr += ` AND ai.status = $${paramIndex++}`;
      queryParams.push(validatedQuery.status);
    }

    if (validatedQuery.deadline_before) {
      queryStr += ` AND ai.deadline <= $${paramIndex++}`;
      queryParams.push(validatedQuery.deadline_before);
    }

    if (validatedQuery.deadline_after) {
      queryStr += ` AND ai.deadline >= $${paramIndex++}`;
      queryParams.push(validatedQuery.deadline_after);
    }

    queryStr += ` ORDER BY ai.${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM action_items ai INNER JOIN meetings m ON ai.meeting_id = m.id WHERE m.user_id = $1';
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (validatedQuery.meeting_id) {
      countQueryStr += ` AND ai.meeting_id = $${countParamIndex++}`;
      countParams.push(validatedQuery.meeting_id);
    }

    if (validatedQuery.assignee) {
      countQueryStr += ` AND ai.assignee = $${countParamIndex++}`;
      countParams.push(validatedQuery.assignee);
    }

    if (validatedQuery.status) {
      countQueryStr += ` AND ai.status = $${countParamIndex++}`;
      countParams.push(validatedQuery.status);
    }

    if (validatedQuery.deadline_before) {
      countQueryStr += ` AND ai.deadline <= $${countParamIndex++}`;
      countParams.push(validatedQuery.deadline_before);
    }

    if (validatedQuery.deadline_after) {
      countQueryStr += ` AND ai.deadline >= $${countParamIndex++}`;
      countParams.push(validatedQuery.deadline_after);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      action_items: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Search action items error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Create action item endpoint
app.post('/api/action-items', authenticateToken, async (req, res) => {
  try {
    const validatedData = createActionItemInputSchema.parse(req.body);

    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [validatedData.meeting_id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const actionItemId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO action_items (id, meeting_id, description, assignee, deadline, status, comments, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [actionItemId, validatedData.meeting_id, validatedData.description, validatedData.assignee, validatedData.deadline, validatedData.status || 'pending', validatedData.comments, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create action item error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get action item by ID endpoint
app.get('/api/action-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT ai.* FROM action_items ai INNER JOIN meetings m ON ai.meeting_id = m.id WHERE ai.id = $1 AND m.user_id = $2', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Action item not found', null, 'ACTION_ITEM_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get action item error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update action item endpoint
app.put('/api/action-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const ownershipResult = await pool.query('SELECT ai.id FROM action_items ai INNER JOIN meetings m ON ai.meeting_id = m.id WHERE ai.id = $1 AND m.user_id = $2', [id, req.user.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Action item not found', null, 'ACTION_ITEM_NOT_FOUND'));
    }

    const validatedData = updateActionItemInputSchema.parse({
      id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE action_items SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update action item error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Delete action item endpoint
app.delete('/api/action-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM action_items WHERE id = $1 AND meeting_id IN (SELECT id FROM meetings WHERE user_id = $2)', [id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json(createErrorResponse('Action item not found', null, 'ACTION_ITEM_NOT_FOUND'));
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete action item error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== FOLLOW-UP EMAIL ENDPOINTS ==========

// Search and list follow-up emails endpoint
app.get('/api/follow-up-emails', authenticateToken, async (req, res) => {
  try {
    const validatedQuery = searchFollowUpEmailsInputSchema.parse(req.query);

    // Build query to get follow-up emails for meetings owned by the user
    let queryStr = 'SELECT fe.* FROM follow_up_emails fe INNER JOIN meetings m ON fe.meeting_id = m.id WHERE m.user_id = $1';
    const queryParams = [req.user.id];
    let paramIndex = 2;

    if (validatedQuery.meeting_id) {
      queryStr += ` AND fe.meeting_id = $${paramIndex++}`;
      queryParams.push(validatedQuery.meeting_id);
    }

    if (validatedQuery.status) {
      queryStr += ` AND fe.status = $${paramIndex++}`;
      queryParams.push(validatedQuery.status);
    }

    if (validatedQuery.scheduled_before) {
      queryStr += ` AND fe.scheduled_send_time <= $${paramIndex++}`;
      queryParams.push(validatedQuery.scheduled_before);
    }

    if (validatedQuery.scheduled_after) {
      queryStr += ` AND fe.scheduled_send_time >= $${paramIndex++}`;
      queryParams.push(validatedQuery.scheduled_after);
    }

    queryStr += ` ORDER BY fe.${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM follow_up_emails fe INNER JOIN meetings m ON fe.meeting_id = m.id WHERE m.user_id = $1';
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (validatedQuery.meeting_id) {
      countQueryStr += ` AND fe.meeting_id = $${countParamIndex++}`;
      countParams.push(validatedQuery.meeting_id);
    }

    if (validatedQuery.status) {
      countQueryStr += ` AND fe.status = $${countParamIndex++}`;
      countParams.push(validatedQuery.status);
    }

    if (validatedQuery.scheduled_before) {
      countQueryStr += ` AND fe.scheduled_send_time <= $${countParamIndex++}`;
      countParams.push(validatedQuery.scheduled_before);
    }

    if (validatedQuery.scheduled_after) {
      countQueryStr += ` AND fe.scheduled_send_time >= $${countParamIndex++}`;
      countParams.push(validatedQuery.scheduled_after);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      follow_up_emails: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Search follow-up emails error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Create follow-up email endpoint
app.post('/api/follow-up-emails', authenticateToken, async (req, res) => {
  try {
    const validatedData = createFollowUpEmailInputSchema.parse(req.body);

    // Verify meeting ownership
    const meetingResult = await pool.query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [validatedData.meeting_id, req.user.id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Meeting not found', null, 'MEETING_NOT_FOUND'));
    }

    const emailId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO follow_up_emails (id, meeting_id, template_id, recipients, subject, body, scheduled_send_time, status, attachments, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [emailId, validatedData.meeting_id, validatedData.template_id, validatedData.recipients, validatedData.subject, validatedData.body, validatedData.scheduled_send_time, validatedData.status || 'draft', validatedData.attachments, now, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create follow-up email error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get follow-up email by ID endpoint
app.get('/api/follow-up-emails/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT fe.* FROM follow_up_emails fe INNER JOIN meetings m ON fe.meeting_id = m.id WHERE fe.id = $1 AND m.user_id = $2', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Follow-up email not found', null, 'EMAIL_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get follow-up email error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Update follow-up email endpoint
app.put('/api/follow-up-emails/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const ownershipResult = await pool.query('SELECT fe.id FROM follow_up_emails fe INNER JOIN meetings m ON fe.meeting_id = m.id WHERE fe.id = $1 AND m.user_id = $2', [id, req.user.id]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Follow-up email not found', null, 'EMAIL_NOT_FOUND'));
    }

    const validatedData = updateFollowUpEmailInputSchema.parse({
      id,
      ...req.body
    });

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(req.body).forEach(key => {
      if (validatedData[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        updateValues.push(validatedData[key]);
      }
    });

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE follow_up_emails SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update follow-up email error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Delete follow-up email endpoint
app.delete('/api/follow-up-emails/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM follow_up_emails WHERE id = $1 AND meeting_id IN (SELECT id FROM meetings WHERE user_id = $2)', [id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json(createErrorResponse('Follow-up email not found', null, 'EMAIL_NOT_FOUND'));
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete follow-up email error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Send follow-up email endpoint
app.post('/api/follow-up-emails/:id/send', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership and get email data
    const result = await pool.query('SELECT fe.* FROM follow_up_emails fe INNER JOIN meetings m ON fe.meeting_id = m.id WHERE fe.id = $1 AND m.user_id = $2', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Follow-up email not found', null, 'EMAIL_NOT_FOUND'));
    }

    const email = result.rows[0];

    if (email.status === 'sent') {
      return res.status(400).json(createErrorResponse('Email has already been sent', null, 'EMAIL_ALREADY_SENT'));
    }

    // Mock email sending
    const emailResponse = await sendFollowUpEmail({
      email_id: email.id,
      recipients: email.recipients,
      subject: email.subject,
      body: email.body,
      attachments: email.attachments
    });

    // Update email status
    const updateResult = await pool.query(
      'UPDATE follow_up_emails SET status = $1, sent_at = $2, updated_at = $3 WHERE id = $4 RETURNING *',
      ['sent', emailResponse.sent_at, new Date().toISOString(), id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Send follow-up email error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== ANALYTICS ENDPOINTS ==========

// Get meeting analytics endpoint
app.get('/api/analytics/meetings', authenticateToken, async (req, res) => {
  try {
    const validatedQuery = searchMeetingAnalyticsInputSchema.parse({
      user_id: req.user.id,
      ...req.query
    });

    let queryStr = 'SELECT * FROM meeting_analytics WHERE user_id = $1';
    const queryParams = [req.user.id];
    let paramIndex = 2;

    if (validatedQuery.period_start) {
      queryStr += ` AND period_start >= $${paramIndex++}`;
      queryParams.push(validatedQuery.period_start);
    }

    if (validatedQuery.period_end) {
      queryStr += ` AND period_end <= $${paramIndex++}`;
      queryParams.push(validatedQuery.period_end);
    }

    queryStr += ` ORDER BY ${validatedQuery.sort_by} ${validatedQuery.sort_order}`;
    queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(validatedQuery.limit, validatedQuery.offset);

    const result = await pool.query(queryStr, queryParams);
    
    // Get total count
    let countQueryStr = 'SELECT COUNT(*) FROM meeting_analytics WHERE user_id = $1';
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (validatedQuery.period_start) {
      countQueryStr += ` AND period_start >= $${countParamIndex++}`;
      countParams.push(validatedQuery.period_start);
    }

    if (validatedQuery.period_end) {
      countQueryStr += ` AND period_end <= $${countParamIndex++}`;
      countParams.push(validatedQuery.period_end);
    }

    const countResult = await pool.query(countQueryStr, countParams);

    res.json({
      analytics: result.rows,
      total_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get meeting analytics error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Invalid query parameters', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Get dashboard analytics endpoint
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const { date_range } = req.query;
    
    // Calculate date range
    let startDate, endDate;
    const now = new Date();
    
    switch (date_range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    // Get total meetings
    const totalMeetingsResult = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3',
      [req.user.id, startDate.toISOString(), endDate.toISOString()]
    );

    // Get total meeting time (in minutes)
    const totalTimeResult = await pool.query(
      'SELECT SUM(EXTRACT(EPOCH FROM (end_time::timestamp - start_time::timestamp))/60) as total_minutes FROM meetings WHERE user_id = $1 AND start_time >= $2 AND end_time <= $3 AND status = $4',
      [req.user.id, startDate.toISOString(), endDate.toISOString(), 'completed']
    );

    // Get action item completion rate
    const actionItemsResult = await pool.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN status = $1 THEN 1 END) as completed FROM action_items ai INNER JOIN meetings m ON ai.meeting_id = m.id WHERE m.user_id = $2 AND ai.created_at >= $3 AND ai.created_at <= $4',
      ['completed', req.user.id, startDate.toISOString(), endDate.toISOString()]
    );

    // Get upcoming meetings
    const upcomingMeetingsResult = await pool.query(
      'SELECT * FROM meetings WHERE user_id = $1 AND start_time > $2 AND status = $3 ORDER BY start_time ASC LIMIT 5',
      [req.user.id, new Date().toISOString(), 'scheduled']
    );

    // Get recent action items
    const recentActionItemsResult = await pool.query(
      'SELECT ai.* FROM action_items ai INNER JOIN meetings m ON ai.meeting_id = m.id WHERE m.user_id = $1 AND ai.status != $2 ORDER BY ai.deadline ASC LIMIT 10',
      [req.user.id, 'completed']
    );

    // Get agent usage
    const agentUsageResult = await pool.query(
      'SELECT a.id as agent_id, a.name as agent_name, COUNT(ma.meeting_id) as meeting_count FROM ai_agents a LEFT JOIN meeting_agents ma ON a.id = ma.agent_id LEFT JOIN meetings m ON ma.meeting_id = m.id WHERE a.user_id = $1 AND (m.created_at IS NULL OR (m.created_at >= $2 AND m.created_at <= $3)) GROUP BY a.id, a.name ORDER BY meeting_count DESC',
      [req.user.id, startDate.toISOString(), endDate.toISOString()]
    );

    const totalMeetings = parseInt(totalMeetingsResult.rows[0].count);
    const totalTime = parseInt(totalTimeResult.rows[0].total_minutes || 0);
    const actionItemsData = actionItemsResult.rows[0];
    const completionRate = actionItemsData.total > 0 ? (actionItemsData.completed / actionItemsData.total) * 100 : 0;

    res.json({
      total_meetings: totalMeetings,
      total_meeting_time: totalTime,
      action_item_completion_rate: completionRate,
      upcoming_meetings: upcomingMeetingsResult.rows,
      recent_action_items: recentActionItemsResult.rows,
      agent_usage: agentUsageResult.rows
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ========== WEBSOCKET HANDLERS ==========

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.id} connected to socket ${socket.id}`);

  // Join user-specific room
  socket.join(`user_${socket.user.id}`);

  // Handle meeting room joins
  socket.on('join_meeting', async (data) => {
    try {
      const { meeting_id } = data;
      
      // Verify meeting access
      const meetingResult = await pool.query('SELECT * FROM meetings WHERE id = $1 AND user_id = $2', [meeting_id, socket.user.id]);
      if (meetingResult.rows.length === 0) {
        socket.emit('error', { message: 'Meeting not found' });
        return;
      }

      socket.join(`meeting_${meeting_id}`);
      
      // Emit to meeting room that user joined
      io.to(`meeting_${meeting_id}`).emit('meeting_participant_joined', {
        event_type: 'meeting_participant_joined',
        meeting_id,
        user: socket.user,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${socket.user.id} joined meeting ${meeting_id}`);
    } catch (error) {
      console.error('Join meeting error:', error);
      socket.emit('error', { message: 'Failed to join meeting' });
    }
  });

  // Handle leaving meeting room
  socket.on('leave_meeting', async (data) => {
    try {
      const { meeting_id } = data;
      
      socket.leave(`meeting_${meeting_id}`);
      
      // Emit to meeting room that user left
      io.to(`meeting_${meeting_id}`).emit('meeting_participant_left', {
        event_type: 'meeting_participant_left',
        meeting_id,
        user: socket.user,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${socket.user.id} left meeting ${meeting_id}`);
    } catch (error) {
      console.error('Leave meeting error:', error);
      socket.emit('error', { message: 'Failed to leave meeting' });
    }
  });

  // Handle real-time transcription
  socket.on('transcription_update', async (data) => {
    try {
      const { meeting_id, audio_chunk } = data;
      
      // Verify meeting access
      const meetingResult = await pool.query('SELECT * FROM meetings WHERE id = $1 AND user_id = $2', [meeting_id, socket.user.id]);
      if (meetingResult.rows.length === 0) {
        socket.emit('error', { message: 'Meeting not found' });
        return;
      }

      // Mock transcription
      const transcriptionResult = await transcribeAudio({
        audio_chunk,
        meeting_id,
        timestamp: new Date().toISOString()
      });

      // Save transcript to database
      const transcriptId = uuidv4();
      const now = new Date().toISOString();
      
      await pool.query(
        'INSERT INTO meeting_transcripts (id, meeting_id, speaker, content, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [transcriptId, meeting_id, transcriptionResult.speaker, transcriptionResult.content, transcriptionResult.timestamp, now]
      );

      // Emit to meeting room
      io.to(`meeting_${meeting_id}`).emit('live_transcript_update', {
        event_type: 'live_transcript_update',
        meeting_id,
        transcript_chunk: {
          id: transcriptId,
          meeting_id,
          speaker: transcriptionResult.speaker,
          content: transcriptionResult.content,
          timestamp: transcriptionResult.timestamp,
          created_at: now
        },
        current_speaker: transcriptionResult.speaker,
        speaking_time_distribution: {} // Mock data
      });

    } catch (error) {
      console.error('Transcription update error:', error);
      socket.emit('error', { message: 'Failed to process transcription' });
    }
  });

  // Handle agent control during meetings
  socket.on('agent_control', async (data) => {
    try {
      const { meeting_id, agent_id, action, params } = data;
      
      // Verify meeting and agent access
      const meetingResult = await pool.query('SELECT * FROM meetings WHERE id = $1 AND user_id = $2', [meeting_id, socket.user.id]);
      const agentResult = await pool.query('SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2', [agent_id, socket.user.id]);
      
      if (meetingResult.rows.length === 0 || agentResult.rows.length === 0) {
        socket.emit('error', { message: 'Meeting or agent not found' });
        return;
      }

      // Process agent control action
      switch (action) {
        case 'toggle_participation':
          // Update agent participation level
          await pool.query('UPDATE ai_agents SET participation_level = $1, updated_at = $2 WHERE id = $3', [params.participation_level, new Date().toISOString(), agent_id]);
          break;
        case 'generate_response':
          // Generate AI response
          const response = await generateAgentResponse({
            agent_id,
            meeting_context: params.context,
            trigger_type: params.trigger
          });
          
          // Emit agent response
          io.to(`meeting_${meeting_id}`).emit('agent_response', {
            event_type: 'agent_response',
            meeting_id,
            agent_id,
            response: response.response_text,
            timestamp: response.timestamp
          });
          break;
      }

      console.log(`Agent control action ${action} executed for agent ${agent_id} in meeting ${meeting_id}`);
    } catch (error) {
      console.error('Agent control error:', error);
      socket.emit('error', { message: 'Failed to control agent' });
    }
  });

  // Handle meeting status changes
  socket.on('meeting_status_change', async (data) => {
    try {
      const { meeting_id, new_status } = data;
      
      // Verify meeting access
      const meetingResult = await pool.query('SELECT status FROM meetings WHERE id = $1 AND user_id = $2', [meeting_id, socket.user.id]);
      if (meetingResult.rows.length === 0) {
        socket.emit('error', { message: 'Meeting not found' });
        return;
      }

      const previousStatus = meetingResult.rows[0].status;

      // Update meeting status
      const updatedMeeting = await pool.query(
        'UPDATE meetings SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [new_status, new Date().toISOString(), meeting_id]
      );

      // If meeting is completed, generate summary
      if (new_status === 'completed') {
        // Get transcripts for summary generation
        const transcriptsResult = await pool.query('SELECT * FROM meeting_transcripts WHERE meeting_id = $1 ORDER BY timestamp', [meeting_id]);
        const participantsResult = await pool.query('SELECT * FROM meeting_participants WHERE meeting_id = $1', [meeting_id]);

        // Generate summary
        const summaryData = await generateMeetingSummary({
          meeting_id,
          transcripts: transcriptsResult.rows,
          participants: participantsResult.rows
        });

        // Save summary
        const summaryId = uuidv4();
        const now = new Date().toISOString();
        
        const summaryResult = await pool.query(
          'INSERT INTO meeting_summaries (id, meeting_id, key_discussion_points, decisions_made, sentiment_analysis, participant_engagement, generated_summary, generated_at, is_finalized, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
          [summaryId, meeting_id, summaryData.key_discussion_points, summaryData.decisions_made, summaryData.sentiment_analysis, summaryData.participant_engagement, summaryData.generated_summary, now, false, now, now]
        );

        // Emit summary generated event
        io.to(`user_${socket.user.id}`).emit('meeting_summary_generated', {
          event_type: 'meeting_summary_generated',
          meeting_id,
          summary: summaryResult.rows[0],
          processing_time: summaryData.processing_time
        });
      }

      // Emit status change to meeting participants
      io.to(`meeting_${meeting_id}`).emit('meeting_status_changed', {
        event_type: 'meeting_status_changed',
        meeting_id,
        previous_status: previousStatus,
        new_status,
        meeting: updatedMeeting.rows[0]
      });

      console.log(`Meeting ${meeting_id} status changed from ${previousStatus} to ${new_status}`);
    } catch (error) {
      console.error('Meeting status change error:', error);
      socket.emit('error', { message: 'Failed to update meeting status' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.id} disconnected from socket ${socket.id}`);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all route for SPA routing (excluding API routes)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { app, pool };

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and listening on 0.0.0.0`);
});