import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { createAiAgentInputSchema } from '@/types/schemas';

// Types based on provided Zod schemas
interface CreateAiAgentInput {
  id: string;
  user_id: string;
  name: string;
  meeting_type: string;
  status: string;
  participation_level: string;
  primary_objectives: string;
  voice_settings: string | null;
  custom_instructions: string | null;
  speaking_triggers: string | null;
  note_taking_focus: string | null;
  follow_up_templates: string | null;
}

interface AgentTemplate {
  id: string;
  name: string;
  meeting_type: string;
  participation_level: string;
  primary_objectives: string;
  voice_settings: string | null;
  custom_instructions: string | null;
  is_public: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

const UV_AgentCreation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  // Local state
  const [agentData, setAgentData] = useState<CreateAiAgentInput>({
    id: '',
    user_id: currentUser?.id || '',
    name: '',
    meeting_type: '',
    status: 'active',
    participation_level: 'observer',
    primary_objectives: '',
    voice_settings: null,
    custom_instructions: null,
    speaking_triggers: null,
    note_taking_focus: null,
    follow_up_templates: null
  });
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<AgentTemplate[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);

  // Get template ID from URL params if provided
  const templateId = searchParams.get('template_id');

  // API endpoints
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

  // Fetch agent templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['agent-templates'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/agent-templates`, {
        params: {
          is_public: true,
          limit: 50
      },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    enabled: isAuthenticated,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: CreateAiAgentInput) => {
      const response = await axios.post(`${API_BASE_URL}/agents`, agentData, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
    },
    onSuccess: (data) => {
      // Invalidate agents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      
      // Redirect to agent management or show success message
      navigate('/agents', { state: { message: 'Agent created successfully!' } });
    },
    onError: (error: any) => {
      setValidationErrors([{
        field: 'general',
        message: error.response?.data?.message || 'Failed to create agent' });
    }
  });

  // Pre-populate from template if template_id is provided
  useEffect(() => {
    if (templateId && templatesData?.templates) {
        const template = templatesData.templates.find((t: AgentTemplate) => t.id === templateId);
      if (template) {
        setAgentData(prev => ({
          ...prev,
          name: template.name,
          meeting_type: template.meeting_type,
          participation_level: template.participation_level,
          primary_objectives: template.primary_objectives,
          voice_settings: template.voice_settings,
          custom_instructions: template.custom_instructions
        });
      }
    }
  }, [templateId, templatesData]);

  // Load available templates when component mounts
  useEffect(() => {
    if (templatesData?.templates) {
      setAvailableTemplates(templatesData.templates);
    }

    // Validate current step data
    const validateStep = useCallback((step: number, data: CreateAiAgentInput): boolean => {
      const errors: ValidationError[] = [];

      switch (step) {
        case 1:
          if (!data.name.trim()) {
            errors.push({ field: 'name', message: 'Agent name is required' });
        }
        
        if (data.name.length > 255) {
          errors.push({ field: 'name', message: 'Agent name must be less than 255 characters' });
        }
        
        // Check for duplicate names (simplified - would need API call in real app)
          break;
        
        case 2:
          if (!data.meeting_type.trim()) {
            errors.push({ field: 'meeting_type', message: 'Meeting type is required' });
        }
        
        if (data.name.includes('test')) {
          errors.push({ field: 'name', message: 'Agent name cannot contain the word "test"' });
        }
        
        case 3:
          if (!data.primary_objectives.trim()) {
            errors.push({ field: 'primary_objectives', message: 'Primary objectives are required' });
        }
        
        case 4:
          if (!data.custom_instructions?.trim()) {
            errors.push({ field: 'custom_instructions', message: 'Custom instructions are required for this agent type' });
        }
        
        default:
          break;
      }

      setValidationErrors(errors);
      return errors.length === 0;
    }, []);

  // Handle step progression
  const nextStep = () => {
      if (validateStep(currentStep, agentData)) {
        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (validateStep(4, agentData)) {
        createAgentMutation.mutate(agentData);
    };

  // Handle agent name availability check (simplified implementation)
  const checkAgentNameAvailability = useCallback(async (name: string) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/agents`, {
        params: { name: agentData.name }
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      return response.data.agents.filter((agent: any) => agent.name === name).length === 0;
    }, []);

  // Handle template selection for pre-population
  const handleTemplateSelect = (template: AgentTemplate) => {
      setAgentData(prev => ({
        ...prev,
        name: template.name,
        meeting_type: template.meeting_type,
        participation_level: template.participation_level,
        primary_objectives: template.primary_objectives,
        voice_settings: template.voice_settings,
        custom_instructions: template.custom_instructions
      });
    };

  // Avatar options for step 1
  const avatarOptions = [
    { id: 'avatar1', url: '/avatars/agent1.png', color: 'bg-blue-500' },
    { id: 'avatar2', url: '/avatars/agent2.png', color: 'bg-green-500' },
    { id: 'avatar3', url: '/avatars/agent3.png', color: 'bg-purple-500' },
    { id: 'avatar4', url: '/avatars/agent4.png', color: 'bg-yellow-500' },
    { id: 'avatar5', url: '/avatars/agent5.png', color: 'bg-red-500' },
    { id: 'avatar6', url: '/avatars/agent6.png', color: 'bg-indigo-500' }
  ];

  // Meeting type options for step 2
  const meetingTypeOptions = [
    { value: 'client', label: 'Client Meeting', description: 'Professional meetings with external clients and stakeholders' }
  ];

  // Behavior preset options for step 2
  const behaviorPresetOptions = [
    { 
      id: 'observer',
      title: 'Observer',
      description: 'Listens attentively, takes detailed notes, and identifies key action items' }
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/agents"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                ← Back to Agents
              </Link>
              <h1 className="mt-4 text-3xl font-bold text-gray-900">Create New AI Agent</h1>
            <p className="mt-2 text-sm text-gray-600">
                Design your intelligent meeting companion
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center space-x-8">
                {[1, 2, 3, 4].map((step) => (
                <li key={step} className="flex items-center">
                  {step > 1 && (
                    <div className="hidden sm:block h-0.5 w-8 bg-gray-200"></div>
                )}
                <li className="flex items-center">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step < currentStep 
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : step === currentStep
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-500'}`}>
                    {step}
                  </span>
                  <span className="ml-4 text-sm font-medium ${
                    step === currentStep 
                      ? 'text-blue-600'
                      : 'text-gray-500'
                    }`}>
                    {step === 1 && 'Basic Info'}
                    {step === 2 && 'Meeting Type'}
                    {step === 3 && 'Voice & Behavior'}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Main Wizard Content */}
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Agent Information */}
            {currentStep === 1 && (
            <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Agent Identity</h2>
                <p className="text-sm text-gray-600">Give your agent a name and visual identity</p>
                
                {/* Agent Name Input */}
                <div>
                  <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  id="agent-name"
                  name="name"
                  value={agentData.name}
                  onChange={(e) => {
                    setValidationErrors(prev => prev.filter(error => error.field !== 'name'));
                    setAgentData(prev => ({ ...prev, name: e.target.value }))
                  }}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    validationErrors.some(error => error.field === 'name') 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  placeholder="Enter agent name (e.g., 'Sales Assistant')`
                  required
                />
                {validationErrors
                  .filter(error => error.field === 'name')
                  .map((error, index) => (
                    <p key={index} className="mt-1 text-sm text-red-600">
                    {error.message}
                  </p>
                ))}
                
                {/* Avatar Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                  Choose an Avatar
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {avatarOptions.map((avatar) => (
                    <div
                      key={avatar.id}
                      className={`cursor-pointer border-2 rounded-lg p-4 text-center ${
                    validationErrors.some(error => error.field === 'avatar'} 
                    ${
                    validationErrors.some(error => error.field === 'avatar') 
                      ? 'border-red-300' 
                      : 'border-gray-200'}`}
                      onClick={() => {
                        // Handle avatar selection
                        setValidationErrors(prev => prev.filter(error => error.field !== 'avatar')));
                    }}
                  >
                    <div className={`w-16 h-16 mx-auto rounded-full ${avatar.color}`}></div>
                      <span className="mt-2 block text-sm font-medium text-gray-900">Avatar {avatar.id}</span>
                    </div>
                  ))}
                </div>
                
                {/* Agent Color Scheme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Scheme
                  </label>
                  <div className="flex space-x-2">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500']).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                    // Handle color selection
                    }}
                  >
                    <span className={`w-8 h-8 rounded-full ${color}`}></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Meeting Type and Behavior */}
          {currentStep === 2 && (
            <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Meeting Role & Behavior</h2>
                
                {/* Meeting Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                  Meeting Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {meetingTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    agentData.meeting_type === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'}`}
                      onClick={() => setAgentData(prev => ({ ...prev, meeting_type: option.value }))
                    }}
                  >
                    <h3 className="font-medium text-gray-900">{option.label}</h3>
                    <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  ))}
                </div>
                
                {/* Behavior Preset Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                  Behavior Preset
                </label>
                <div className="space-y-3">
                  {behaviorPresetOptions.map((preset) => (
                    <div
                      key={preset.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    agentData.participation_level === preset.id 
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white'}`}
                      onClick={() => setAgentData(prev => ({ ...prev, participation_level: preset.id }))
                    }}
                  >
                    <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                    agentData.participation_level === preset.id}
                    />
                    <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">{preset.title}</h4>
                        <p className="text-sm text-gray-500">{preset.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Voice Customization */}
          {currentStep === 3 && (
            <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Voice & Speech Style</h2>
                
                {/* Voice Gender Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Gender
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {/* Male */}
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${
                    agentData.voice_settings?.includes('male') 
                    ? 'text-blue-600 border-blue-300 bg-blue-50' 
                    : 'border-gray-300'}`}
                >
                  <div className={`w-8 h-8 rounded-full bg-blue-400`}></div>
                    <span className="block text-sm font-medium">Male</span>
                    </div>
                  {/* Female */}
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${
                    agentData.voice_settings?.includes('femele') 
                    ? 'text-pink-600 border-pink-300'}`}></div>
                  {/* Neutral */}
                  <div
                    className={`border rounded-lg p-4 cursor-pointer ${
                    agentData.voice_settings?.includes('neutral') 
                    ? 'text-gray-600 border-gray-300'}`}></div>
                </div>
                
                {/* Accent Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent
                </label>
                <div className="space-y-2">
                  {['American', 'British', 'Australian'].map((accent) => (
                    <div
                      key={accent}
                      className={`border rounded-lg p-3 cursor-pointer text-center ${
                    validationErrors.some(error => error.field === 'accent'}`}></div>
                </div>
                
                {/* Speech Pace Controls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speech Pace
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={agentData.voice_settings?.includes('pace') || '1.0'}`}
                    onChange={(e) => {
                    setAgentData(prev => ({ 
                      ...prev, 
                      voice_settings: JSON.stringify({ 
                        ...(agentData.voice_settings ? JSON.parse(agentData.voice_settings) : {},
                        pace: parseFloat(e.target.value)
                      })
                    }}
                  />
                  
                  {/* Test Playback Button */}
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Test Voice
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Custom Instructions */}
            {currentStep === 4 && (
            <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Custom Instructions & Configuration</h2>
                
                {/* Custom Instructions Text Area */}
                <div>
                  <label htmlFor="custom-instructions" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions
                </label>
                <textarea
                  id="custom-instructions"
                  name="custom_instructions"
                  rows={8}
                  value={agentData.custom_instructions || ''}
                  onChange={(e) => {
                    setValidationErrors(prev => prev.filter(error => error.field !== 'custom_instructions')));
                  setAgentData(prev => ({ ...prev, custom_instructions: e.target.value }))
                  }}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    validationErrors.some(error => error.field === 'custom_instructions'}`}></div>
                  placeholder="Provide specific instructions for how this agent should behave in meetings..."
                />
                
                {/* Template Suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Templates
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Focus on action items and decisions',
                    'Track speaking time and participation',
                    'Identify key discussion points',
                    'Monitor meeting sentiment and engagement'
                  ].map((template, index) => (
                    <button
                      key={index}
                      type="button"
                  >
                    {template}
                  </button>
                ))}
                
                {/* Do's and Don'ts Configuration */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Do's & Don'ts
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="What the agent should do..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <span className="text-green-600">✓</span>
                    <span className="text-sm text-gray-600">Examples of good behavior</span>
                    </div>
                  <div className="flex items-center space-x-3">
                      <span className="text-green-600">Do:</span>
                    </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-red-600">✗</span>
                    <span className="text-sm text-gray-600">Examples of behaviors to avoid</span>
                    </div>
                </div>
                
                {/* Preview Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Agent Preview</h4>
                    <div className="border rounded-lg p-4">
                      <h5 className="text-lg font-semibold text-gray-900">{agentData.name}</h5>
                      <p className="text-sm text-gray-600">Meeting Type: {agentData.meeting_type}</p>
                    <p className="text-sm text-gray-600">Participation Level: {agentData.participation_level}</p>
                      <p className="text-sm text-gray-600">Primary Objectives: {agentData.primary_objectives}</p>
                    </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  Previous
                </button>
                )}
                
                <div className="flex space-x-3">
                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                    Next
                  </button>
                  ) : (
                  <button
                    type="submit"
                    disabled={createAgentMutation.isLoading}
                  >
                    {createAgentMutation.isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Agent...
                    </span>
                  ) : (
                    'Create Agent'
                  )}
                </button>
                )}
              </div>
            </div>

            {/* Save as Template Option */}
            {currentStep === 4 && (
              <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="save-as-template"
                      checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}`}
                  />
                  <label htmlFor="save-as-template" className="text-sm text-gray-700">Save this configuration as a reusable template</label>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_AgentCreation;