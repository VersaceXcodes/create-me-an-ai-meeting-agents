import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Types for support data
interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  last_updated: string;
}

interface FAQCategory {
  id: string;
  name: string;
  questions: FAQQuestion[];
}

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
}

interface SupportTicketForm {
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  attachments: File[];
}

interface FeatureRequestForm {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

// Mock data for development
const MOCK_FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: '1',
    name: 'Getting Started',
    questions: [
      {
        id: '1-1',
        question: 'How do I create my first AI agent?',
        answer: 'To create your first AI agent, go to the Agents section and click "Create New Agent". Follow the step-by-step wizard to configure name, meeting type, and behavior settings.'
      },
      {
        id: '1-2',
        question: 'What types of meetings does MeetMate support?',
        answer: 'MeetMate supports various meeting types including client meetings, team standups, brainstorming sessions, project reviews, and one-on-ones. Each type can be customized with specific agent behaviors.'
      }
    ]
  },
  {
    id: '2',
    name: 'Calendar Integration',
    questions: [
      {
        id: '2-1',
        question: 'How do I connect my Google Calendar?',
        answer: 'Navigate to Calendar Integration settings and click "Connect Google Calendar". You will be redirected to Google to authorize MeetMate access to your calendar events.'
      },
      {
        id: '2-2',
        question: 'Can I use multiple calendar accounts?',
        answer: 'Currently, MeetMate supports one primary calendar account per user. We are working on multi-calendar support in future updates.'
      }
    ]
  },
  {
    id: '3',
    name: 'AI Agent Features',
    questions: [
      {
        id: '3-1',
        question: 'How does the AI agent participate in meetings?',
        answer: 'The AI agent can act as observer, active participant, or passive observer based on your configuration. It joins automatically at meeting start time and provides real-time transcription and insights.'
      },
      {
        id: '3-2',
        question: 'Can I customize what the AI agent says?',
        answer: 'Yes! You can set custom instructions, speaking triggers, and define the agent’s role and objectives in the agent configuration settings.'
      }
    ]
  }
];

const MOCK_KNOWLEDGE_BASE_ARTICLES: KnowledgeBaseArticle[] = [
  {
    id: 'kb-1',
    title: 'Setting Up Your First Meeting with AI Agent',
    category: 'Getting Started',
    content: 'Complete guide to setting up your first meeting with an AI assistant...',
    last_updated: '2024-01-15T10:30:00Z'
  },
  {
    id: 'kb-2',
    title: 'Calendar Integration Best Practices',
    category: 'Calendar Integration',
    content: 'Tips for optimizing your calendar integration and meeting detection...',
    last_updated: '2024-01-14T14:45:00Z'
  },
  {
    id: 'kb-3',
    title: 'Advanced Agent Configuration',
    category: 'AI Agents',
    content: 'Learn how to create complex agent behaviors and custom instructions...',
    last_updated: '2024-01-13T09:15:00Z'
  }
];

const UV_SupportHelp: React.FC = () => {
  // State from datamap
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<KnowledgeBaseArticle[]>([]);
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>([]);
  const [supportTicketForm, setSupportTicketForm] = useState<SupportTicketForm>({
    subject: '',
    description: '',
    category: '',
    priority: 'medium',
    attachments: []
  });
  const [featureRequestForm, setFeatureRequestForm] = useState<FeatureRequestForm>({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [activeFaqCategory, setActiveFaqCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge-base' | 'faq' | 'support' | 'feature-requests'>('knowledge-base');

  // Global state access
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // Mock API functions (to be replaced with real endpoints)
  const searchKnowledgeBase = async (query: string): Promise<KnowledgeBaseArticle[]> => {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const filtered = MOCK_KNOWLEDGE_BASE_ARTICLES.filter(article =>
          article.title.toLowerCase().includes(query.toLowerCase()) ||
          article.content.toLowerCase().includes(query.toLowerCase())
        );
        resolve(filtered);
      }, 500);
    });
  };

  const loadFAQCategories = async (): Promise<FAQCategory[]> => {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_FAQ_CATEGORIES);
      }, 300);
    });
  };

  const submitSupportTicket = async (ticketData: SupportTicketForm): Promise<void> => {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Support ticket submitted:', ticketData);
        resolve();
      }, 1000);
    });
  };

  const submitFeatureRequest = async (featureData: FeatureRequestForm): Promise<void> => {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Feature request submitted:', featureData);
        resolve();
      }, 1000);
    });
  };

  // React Query for data fetching
  const { data: faqData, isLoading: faqLoading } = useQuery({
    queryKey: ['faq-categories'],
    queryFn: loadFAQCategories,
    enabled: activeTab === 'faq'
  });

  // Effects
  useEffect(() => {
    if (faqData) {
      setFaqCategories(faqData);
    }
  }, [faqData]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchKnowledgeBase(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Event handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the useEffect above
  };

  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to submit a support ticket');
      return;
    }

    setIsLoading(true);
    try {
      await submitSupportTicket(supportTicketForm);
      setSubmissionSuccess(true);
      setSupportTicketForm({
        subject: '',
        description: '',
        category: '',
        priority: 'medium',
        attachments: []
      });
      setTimeout(() => setSubmissionSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      alert('Failed to submit support ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to submit a feature request');
      return;
    }

    setIsLoading(true);
    try {
      await submitFeatureRequest(featureRequestForm);
      setSubmissionSuccess(true);
      setFeatureRequestForm({
        title: '',
        description: '',
        category: '',
        priority: 'medium'
      });
      setTimeout(() => setSubmissionSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to submit feature request:', error);
      alert('Failed to submit feature request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSupportTicketForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(files)]
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setSupportTicketForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const toggleFaqCategory = (categoryId: string) => {
    setActiveFaqCategory(activeFaqCategory === categoryId ? null : categoryId);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help & Support</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Get help with MeetMate AI, browse documentation, or contact our support team
            </p>
          </div>

          {/* Success Message */}
          {submissionSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Your request has been submitted successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'knowledge-base', name: 'Knowledge Base' },
                { id: 'faq', name: 'FAQ' },
                { id: 'support', name: 'Contact Support' },
                { id: 'feature-requests', name: 'Feature Requests' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge-base' && (
            <div className="space-y-6">
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search our knowledge base..."
                      className="w-full px-4 py-3 pl-12 pr-4 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </form>
              </div>

              {isLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Searching knowledge base...</p>
                </div>
              )}

              {searchQuery && !isLoading && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Search Results for "{searchQuery}"
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {searchResults.length} article{searchResults.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {searchResults.map((article) => (
                      <div key={article.id} className="px-6 py-4 hover:bg-gray-50">
                        <h4 className="text-md font-medium text-gray-900">{article.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{article.category}</p>
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{article.content}</p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>Last updated: {new Date(article.last_updated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!searchQuery && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Getting Started',
                      description: 'Learn how to set up your account and create your first AI agent',
                      icon: '🚀',
                      articles: 12
                    },
                    {
                      title: 'AI Agents',
                      description: 'Configure and customize your AI meeting assistants',
                      icon: '🤖',
                      articles: 8
                    },
                    {
                      title: 'Calendar Integration',
                      description: 'Connect and sync with your calendar services',
                      icon: '📅',
                      articles: 6
                    },
                    {
                      title: 'Meeting Management',
                      description: 'Schedule, run, and review meetings with AI assistance',
                      icon: '🎯',
                      articles: 15
                    },
                    {
                      title: 'Troubleshooting',
                      description: 'Common issues and how to resolve them',
                      icon: '🔧',
                      articles: 10
                    },
                    {
                      title: 'Best Practices',
                      description: 'Tips for getting the most out of MeetMate AI',
                      icon: '⭐',
                      articles: 7
                    }
                  ].map((category, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                      <div className="text-2xl mb-3">{category.icon}</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{category.articles} articles</span>
                        <button 
                          onClick={() => {
                            setSearchQuery(category.title);
                            setActiveTab('knowledge-base');
                          }}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          Browse articles →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="max-w-4xl mx-auto">
              {faqLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading FAQs...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {faqCategories.map((category) => (
                    <div key={category.id} className="bg-white rounded-lg shadow">
                      <button
                        onClick={() => toggleFaqCategory(category.id)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 rounded-lg"
                      >
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                        <svg
                          className={`h-5 w-5 text-gray-500 transform transition-transform ${
                            activeFaqCategory === category.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {activeFaqCategory === category.id && (
                        <div className="px-6 pb-4">
                          <div className="space-y-4">
                            {category.questions.map((question) => (
                              <div key={question.id} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                                <h4 className="font-medium text-gray-900 mb-2">{question.question}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{question.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Support Tab */}
          {activeTab === 'support' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Support</h2>
                <p className="text-gray-600 mb-6">
                  Having trouble with MeetMate? Our support team is here to help. Please provide as much detail as possible about your issue.
                </p>

                {!isAuthenticated && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-yellow-800 text-sm">
                      Please <Link to="/login" className="text-blue-600 hover:text-blue-500 underline">sign in</Link> to submit a support ticket.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSupportTicketSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={supportTicketForm.subject}
                      onChange={(e) => setSupportTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                      required
                      disabled={!isAuthenticated || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      value={supportTicketForm.category}
                      onChange={(e) => setSupportTicketForm(prev => ({ ...prev, category: e.target.value }))}
                      required
                      disabled={!isAuthenticated || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a category</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Account</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={supportTicketForm.priority}
                      onChange={(e) => setSupportTicketForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                      disabled={!isAuthenticated || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={supportTicketForm.description}
                      onChange={(e) => setSupportTicketForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                      disabled={!isAuthenticated || isLoading}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                    />
                  </div>

                  <div>
                    <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments
                    </label>
                    <input
                      type="file"
                      id="attachments"
                      multiple
                      onChange={handleFileUpload}
                      disabled={!isAuthenticated || isLoading}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:file:bg-gray-100 disabled:file:cursor-not-allowed"
                    />
                    {supportTicketForm.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {supportTicketForm.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm text-gray-600">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              disabled={!isAuthenticated || isLoading}
                              className="text-red-600 hover:text-red-500 disabled:text-gray-400"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!isAuthenticated || isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Ticket...
                      </>
                    ) : (
                      'Submit Support Ticket'
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Feature Requests Tab */}
          {activeTab === 'feature-requests' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Feature Requests</h2>
                <p className="text-gray-600 mb-6">
                  Have an idea to improve MeetMate? Let us know! We're always looking for ways to make our platform better.
                </p>

                {!isAuthenticated && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-yellow-800 text-sm">
                      Please <Link to="/login" className="text-blue-600 hover:text-blue-500 underline">sign in</Link> to submit a feature request.
                    </p>
                  </div>
                )}

                <form onSubmit={handleFeatureRequestSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="feature-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Feature Title
                    </label>
                    <input
                      type="text"
                      id="feature-title"
                      value={featureRequestForm.title}
                      onChange={(e) => setFeatureRequestForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      disabled={!isAuthenticated || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="What feature would you like to see?"
                    />
                  </div>

                  <div>
                    <label htmlFor="feature-category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      id="feature-category"
                      value={featureRequestForm.category}
                      onChange={(e) => setFeatureRequestForm(prev => ({ ...prev, category: e.target.value }))}
                      required
                      disabled={!isAuthenticated || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a category</option>
                      <option value="ai-agents">AI Agents</option>
                      <option value="calendar-integration">Calendar Integration</option>
                      <option value="meeting-features">Meeting Features</option>
                      <option value="analytics">Analytics & Reporting</option>
                      <option value="mobile">Mobile App</option>
                      <option value="integrations">Third-party Integrations</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="feature-priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      id="feature-priority"
                      value={featureRequestForm.priority}
                      onChange={(e) => setFeatureRequestForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                      disabled={!isAuthenticated || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="low">Nice to have</option>
                      <option value="medium">Important</option>
                      <option value="high">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="feature-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Detailed Description
                    </label>
                    <textarea
                      id="feature-description"
                      value={featureRequestForm.description}
                      onChange={(e) => setFeatureRequestForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                      disabled={!isAuthenticated || isLoading}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Please describe the feature in detail. What problem does it solve? How would you use it?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isAuthenticated || isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Request...
                      </>
                    ) : (
                      'Submit Feature Request'
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SupportHelp;