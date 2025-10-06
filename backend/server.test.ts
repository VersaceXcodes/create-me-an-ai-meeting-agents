import request from 'supertest';
import { app, pool } from './server.js';

// Mock external dependencies
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 'user_001' })
}));

// Test setup and teardown
beforeAll(async () => {
  // Ensure database connection is established
  await pool.query('SELECT 1');
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clear any test data and reset sequences
  await pool.query('DELETE FROM follow_up_emails');
  await pool.query('DELETE FROM meeting_recordings');
  await pool.query('DELETE FROM meeting_transcripts');
  await pool.query('DELETE FROM action_items');
  await pool.query('DELETE FROM meeting_summaries');
  await pool.query('DELETE FROM meeting_participants');
  await pool.query('DELETE FROM meeting_agents');
  await pool.query('DELETE FROM meetings');
  await pool.query('DELETE FROM ai_agents');
  await pool.query('DELETE FROM agent_templates');
  await pool.query('DELETE FROM calendar_integrations');
  await pool.query('DELETE FROM user_preferences');
  await pool.query('DELETE FROM password_reset_tokens');
  await pool.query('DELETE FROM users');

  // Re-seed test data
  await seedTestData();
});

async function seedTestData() {
  // Insert test users
  await pool.query(`
    INSERT INTO users (id, email, full_name, password_hash, email_verified, created_at, updated_at, is_active) VALUES
    ('user_001', 'alice.johnson@example.com', 'Alice Johnson', 'password123', true, '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z', true),
    ('user_002', 'bob.smith@example.com', 'Bob Smith', 'password123', true, '2024-01-16T09:15:00Z', '2024-01-16T09:15:00Z', true),
    ('user_003', 'carol.davis@example.com', 'Carol Davis', 'password123', false, '2024-01-17T14:20:00Z', '2024-01-17T14:20:00Z', true)
  `);

  // Insert user preferences
  await pool.query(`
    INSERT INTO user_preferences (id, user_id, email_notifications, push_notifications, follow_up_reminders, created_at, updated_at) VALUES
    ('pref_001', 'user_001', true, false, true, '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z'),
    ('pref_002', 'user_002', true, true, false, '2024-01-16T09:15:00Z', '2024-01-16T09:15:00Z')
  `);

  // Insert AI agents
  await pool.query(`
    INSERT INTO ai_agents (id, user_id, name, meeting_type, status, participation_level, primary_objectives, created_at, updated_at) VALUES
    ('agent_001', 'user_001', 'Project Manager Assistant', 'project_planning', 'active', 'active_participant', 'Track action items', '2024-01-15T12:00:00Z', '2024-01-15T12:00:00Z'),
    ('agent_002', 'user_002', 'Sales Meeting Analyst', 'sales_review', 'active', 'observer', 'Track sales metrics', '2024-01-16T10:00:00Z', '2024-01-16T10:00:00Z')
  `);

  // Insert meetings
  await pool.query(`
    INSERT INTO meetings (id, user_id, title, start_time, end_time, meeting_type, status, created_at, updated_at) VALUES
    ('meeting_001', 'user_001', 'Q1 Project Planning Session', '2024-01-20T14:00:00Z', '2024-01-20T15:30:00Z', 'project_planning', 'completed', '2024-01-18T09:00:00Z', '2024-01-18T09:00:00Z'),
    ('meeting_002', 'user_002', 'Monthly Sales Review', '2024-01-22T10:00:00Z', '2024-01-22T11:00:00Z', 'sales_review', 'scheduled', '2024-01-19T14:00:00Z', '2024-01-19T14:00:00Z')
  `);
}

function getAuthToken(userId = 'user_001') {
  return 'mock_jwt_token';
}

// ========== UNIT TESTS ==========

describe('Utility Functions', () => {
  describe('Date Validation', () => {
    it('should validate ISO date strings correctly', () => {
      const validDate = '2024-01-20T14:00:00Z';
      const invalidDate = 'invalid-date';
      
      expect(() => new Date(validDate).toISOString()).not.toThrow();
      expect(() => new Date(invalidDate).toISOString()).toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    it('should validate password strength', () => {
      const strongPassword = 'Password123!';
      const weakPassword = '123';
      
      expect(strongPassword.length).toBeGreaterThanOrEqual(8);
      expect(weakPassword.length).toBeLessThan(8);
    });
  });
});

// ========== AUTHENTICATION TESTS ==========

describe('Authentication API', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'newuser@example.com',
        full_name: 'New User',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user.full_name).toBe(newUser.full_name);
      expect(response.body).toHaveProperty('auth_token');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidUser = {
        email: 'invalid-email',
        full_name: 'Test User',
        password: 'Password123!'
      };

      await request(app)
        .post('/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const duplicateUser = {
        email: 'alice.johnson@example.com', // Already exists in seed data
        full_name: 'Duplicate User',
        password: 'Password123!'
      };

      await request(app)
        .post('/auth/register')
        .send(duplicateUser)
        .expect(409);
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordUser = {
        email: 'weakpass@example.com',
        full_name: 'Weak Password User',
        password: '123'
      };

      await request(app)
        .post('/auth/register')
        .send(weakPasswordUser)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully with correct credentials', async () => {
      const credentials = {
        email: 'alice.johnson@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body).toHaveProperty('auth_token');
    });

    it('should return 401 for incorrect password', async () => {
      const credentials = {
        email: 'alice.johnson@example.com',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);
    });
  });

  describe('POST /auth/password-reset', () => {
    it('should initiate password reset for existing user', async () => {
      await request(app)
        .post('/auth/password-reset')
        .send({ email: 'alice.johnson@example.com' })
        .expect(200);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .post('/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);
    });
  });
});

// ========== USER MANAGEMENT TESTS ==========

describe('User Management API', () => {
  describe('GET /users/me', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('alice.johnson@example.com');
    });

    it('should return 401 without authentication token', async () => {
      await request(app)
        .get('/users/me')
        .expect(401);
    });
  });

  describe('PUT /users/me/preferences', () => {
    it('should update user preferences successfully', async () => {
      const updatedPrefs = {
        email_notifications: false,
        push_notifications: true,
        follow_up_reminders: false
      };

      const response = await request(app)
        .put('/users/me/preferences')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(updatedPrefs)
        .expect(200);

      expect(response.body.email_notifications).toBe(false);
      expect(response.body.push_notifications).toBe(true);
      expect(response.body.follow_up_reminders).toBe(false);
    });
  });
});

// ========== AI AGENT TESTS ==========

describe('AI Agent API', () => {
  describe('GET /agents', () => {
    it('should list user agents with filtering', async () => {
      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body).toHaveProperty('total_count');
    });

    it('should filter agents by meeting type', async () => {
      const response = await request(app)
        .get('/agents?meeting_type=project_planning')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.agents.every(agent => 
        agent.meeting_type === 'project_planning'
      )).toBe(true);
    });

    it('should paginate agent results', async () => {
      const response = await request(app)
        .get('/agents?limit=1&offset=0')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.agents.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /agents', () => {
    it('should create a new AI agent', async () => {
      const newAgent = {
        user_id: 'user_001',
        name: 'Test Agent',
        meeting_type: 'brainstorming',
        primary_objectives: 'Take notes and generate ideas',
        participation_level: 'observer'
      };

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(newAgent)
        .expect(201);

      expect(response.body.name).toBe(newAgent.name);
      expect(response.body.meeting_type).toBe(newAgent.meeting_type);
      expect(response.body.status).toBe('active');
    });

    it('should return 400 for invalid agent data', async () => {
      const invalidAgent = {
        name: '', // Empty name should fail validation
        meeting_type: 'brainstorming'
      };

      await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(invalidAgent)
        .expect(400);
    });
  });

  describe('PUT /agents/:id', () => {
    it('should update an existing agent', async () => {
      const updateData = {
        name: 'Updated Agent Name',
        participation_level: 'active_participant'
      };

      const response = await request(app)
        .put('/agents/agent_001')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.participation_level).toBe(updateData.participation_level);
    });

    it('should return 404 for non-existent agent', async () => {
      await request(app)
        .put('/agents/non_existent_agent')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /agents/:id', () => {
    it('should delete an agent successfully', async () => {
      await request(app)
        .delete('/agents/agent_001')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(204);
    });
  });
});

// ========== MEETING MANAGEMENT TESTS ==========

describe('Meeting Management API', () => {
  describe('GET /meetings', () => {
    it('should list user meetings with filters', async () => {
      const response = await request(app)
        .get('/meetings')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('meetings');
      expect(Array.isArray(response.body.meetings)).toBe(true);
    });

    it('should filter meetings by status', async () => {
      const response = await request(app)
        .get('/meetings?status=completed')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.meetings.every(meeting => 
        meeting.status === 'completed'
      )).toBe(true);
    });
  });

  describe('POST /meetings', () => {
    it('should create a new meeting', async () => {
      const newMeeting = {
        user_id: 'user_001',
        title: 'Test Meeting',
        start_time: '2024-02-01T10:00:00Z',
        end_time: '2024-02-01T11:00:00Z',
        meeting_type: 'team_meeting',
        description: 'Test meeting description'
      };

      const response = await request(app)
        .post('/meetings')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(newMeeting)
        .expect(201);

      expect(response.body.title).toBe(newMeeting.title);
      expect(response.body.meeting_type).toBe(newMeeting.meeting_type);
      expect(response.body.status).toBe('scheduled');
    });

    it('should return 400 for invalid meeting data', async () => {
      const invalidMeeting = {
        title: '', // Empty title
        start_time: '2024-02-01T10:00:00Z',
        end_time: '2024-02-01T09:00:00Z' // End time before start time
      };

      await request(app)
        .post('/meetings')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(invalidMeeting)
        .expect(400);
    });
  });

  describe('POST /meetings/:id/assign-agent', () => {
    it('should assign agent to meeting', async () => {
      const assignData = {
        agent_id: 'agent_001'
      };

      const response = await request(app)
        .post('/meetings/meeting_002/assign-agent')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(assignData)
        .expect(200);

      expect(response.body.meeting_id).toBe('meeting_002');
      expect(response.body.agent_id).toBe('agent_001');
      expect(response.body.join_status).toBe('pending');
    });
  });
});

// ========== ACTION ITEM TESTS ==========

describe('Action Items API', () => {
  describe('GET /action-items', () => {
    it('should list action items with filters', async () => {
      // First create an action item
      await pool.query(`
        INSERT INTO action_items (id, meeting_id, description, assignee, deadline, status, created_at, updated_at) 
        VALUES ('action_test_001', 'meeting_001', 'Test action item', 'John Doe', '2024-02-01T17:00:00Z', 'pending', '2024-01-20T15:30:00Z', '2024-01-20T15:30:00Z')
      `);

      const response = await request(app)
        .get('/action-items?meeting_id=meeting_001')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('action_items');
      expect(response.body.action_items.length).toBeGreaterThan(0);
    });
  });

  describe('POST /action-items', () => {
    it('should create a new action item', async () => {
      const newActionItem = {
        meeting_id: 'meeting_001',
        description: 'Complete project documentation',
        assignee: 'Alice Johnson',
        deadline: '2024-02-15T17:00:00Z',
        status: 'pending'
      };

      const response = await request(app)
        .post('/action-items')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(newActionItem)
        .expect(201);

      expect(response.body.description).toBe(newActionItem.description);
      expect(response.body.assignee).toBe(newActionItem.assignee);
      expect(response.body.status).toBe('pending');
    });
  });

  describe('PUT /action-items/:id', () => {
    it('should update action item status', async () => {
      // First create an action item
      await pool.query(`
        INSERT INTO action_items (id, meeting_id, description, assignee, deadline, status, created_at, updated_at) 
        VALUES ('action_test_002', 'meeting_001', 'Update task', 'John Doe', '2024-02-01T17:00:00Z', 'pending', '2024-01-20T15:30:00Z', '2024-01-20T15:30:00Z')
      `);

      const updateData = {
        status: 'completed',
        comments: 'Task completed successfully'
      };

      const response = await request(app)
        .put('/action-items/action_test_002')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.comments).toBe('Task completed successfully');
    });
  });
});

// ========== FOLLOW-UP EMAIL TESTS ==========

describe('Follow-up Emails API', () => {
  describe('POST /follow-up-emails/:id/send', () => {
    it('should send a follow-up email', async () => {
      // First create a follow-up email
      await pool.query(`
        INSERT INTO follow_up_emails (id, meeting_id, recipients, subject, body, status, created_at, updated_at) 
        VALUES ('email_test_001', 'meeting_001', 'test@example.com', 'Test Subject', 'Test Body', 'draft', '2024-01-20T15:40:00Z', '2024-01-20T15:40:00Z')
      `);

      const response = await request(app)
        .post('/follow-up-emails/email_test_001/send')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.status).toBe('sent');
      expect(response.body.sent_at).not.toBeNull();
    });
  });
});

// ========== ANALYTICS TESTS ==========

describe('Analytics API', () => {
  describe('GET /analytics/dashboard', () => {
    it('should return dashboard analytics', async () => {
      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_meetings');
      expect(response.body).toHaveProperty('total_meeting_time');
      expect(response.body).toHaveProperty('action_item_completion_rate');
      expect(response.body).toHaveProperty('upcoming_meetings');
      expect(response.body).toHaveProperty('recent_action_items');
      expect(response.body).toHaveProperty('agent_usage');
    });
  });
});

// ========== ERROR HANDLING TESTS ==========

describe('Error Handling', () => {
  it('should return 404 for non-existent endpoints', async () => {
    await request(app)
      .get('/non-existent-endpoint')
      .set('Authorization', `Bearer ${getAuthToken()}`)
      .expect(404);
  });

  it('should return 500 for server errors', async () => {
    // Mock a database error
    jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Database error'));

    await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${getAuthToken()}`)
      .expect(500);
  });

  it('should return 400 for malformed JSON', async () => {
    await request(app)
      .post('/agents')
      .set('Authorization', `Bearer ${getAuthToken()}`)
      .set('Content-Type', 'application/json')
      .send('invalid json')
      .expect(400);
  });
});

// ========== DATABASE CONSTRAINTS TESTS ==========

describe('Database Constraints', () => {
  it('should enforce unique email constraint', async () => {
    const duplicateUser = {
      email: 'alice.johnson@example.com', // Already exists
      full_name: 'Duplicate User',
      password: 'Password123!'
    };

    await request(app)
      .post('/auth/register')
      .send(duplicateUser)
      .expect(409);
  });

  it('should enforce foreign key constraints', async () => {
    const invalidMeetingAgent = {
      meeting_id: 'non_existent_meeting',
      agent_id: 'non_existent_agent',
      join_status: 'pending'
    };

    // This should fail due to foreign key constraints
    await expect(
      pool.query(
        'INSERT INTO meeting_agents (id, meeting_id, agent_id, join_status) VALUES ($1, $2, $3, $4)',
        ['ma_test', invalidMeetingAgent.meeting_id, invalidMeetingAgent.agent_id, invalidMeetingAgent.join_status]
      )
    ).rejects.toThrow();
  });
});

// ========== WEB SOCKET TESTS ==========

describe('WebSocket Events', () => {
  let wsClient;

  beforeEach(() => {
    // Mock WebSocket client setup
    wsClient = {
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn()
    };
  });

  it('should handle meeting_join event', () => {
    const meetingJoinEvent = {
      event_type: 'meeting_join',
      meeting_id: 'meeting_001',
      user_id: 'user_001'
    };

    // Simulate WebSocket event handling
    const handler = wsClient.on.mock.calls.find(call => call[0] === 'meeting_join');
    if (handler) {
      handler[1](meetingJoinEvent);
    }

    expect(wsClient.on).toHaveBeenCalledWith('meeting_join', expect.any(Function));
  });

  it('should handle transcription_update event', () => {
    const transcriptEvent = {
      event_type: 'live_transcript_update',
      meeting_id: 'meeting_001',
      transcript_chunk: {
        speaker: 'John Doe',
        content: 'This is a test transcription',
        timestamp: '2024-01-20T14:00:05Z'
      }
    };

    const handler = wsClient.on.mock.calls.find(call => call[0] === 'live_transcript_update');
    if (handler) {
      handler[1](transcriptEvent);
    }

    expect(wsClient.on).toHaveBeenCalledWith('live_transcript_update', expect.any(Function));
  });
});

// ========== INTEGRATION TESTS ==========

describe('End-to-End User Journey', () => {
  it('should complete full user meeting workflow', async () => {
    // 1. User registers
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'journey@example.com',
        full_name: 'Journey User',
        password: 'Password123!'
      })
      .expect(201);

    const authToken = registerResponse.body.auth_token;

    // 2. User creates an agent
    const agentResponse = await request(app)
      .post('/agents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        user_id: registerResponse.body.user.id,
        name: 'Journey Agent',
        meeting_type: 'team_meeting',
        primary_objectives: 'Take comprehensive notes',
        participation_level: 'observer'
      })
      .expect(201);

    const agentId = agentResponse.body.id;

    // 3. User creates a meeting
    const meetingResponse = await request(app)
      .post('/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        user_id: registerResponse.body.user.id,
        title: 'Journey Meeting',
        start_time: '2024-02-01T14:00:00Z',
        end_time: '2024-02-01T15:00:00Z',
        meeting_type: 'team_meeting'
      })
      .expect(201);

    const meetingId = meetingResponse.body.id;

    // 4. Assign agent to meeting
    await request(app)
      .post(`/meetings/${meetingId}/assign-agent`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    // 5. Create action items
    const actionItemResponse = await request(app)
      .post('/action-items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        meeting_id: meetingId,
        description: 'Follow up on action items',
        assignee: 'Journey User',
        deadline: '2024-02-08T17:00:00Z'
      })
      .expect(201);

    // 6. Verify workflow completion
    expect(agentResponse.body.name).toBe('Journey Agent');
    expect(meetingResponse.body.title).toBe('Journey Meeting');
    expect(actionItemResponse.body.description).toBe('Follow up on action items');
  });
});