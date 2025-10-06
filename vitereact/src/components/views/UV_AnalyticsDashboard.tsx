import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Chart components - using Chart.js with react-chartjs-2
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Type definitions for analytics data
interface MeetingAnalyticsData {
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

interface DashboardMetrics {
  total_meetings: number;
  total_meeting_time: number;
  action_item_completion_rate: number;
  upcoming_meetings: Array<any>;
  recent_action_items: Array<any>;
  agent_usage: Array<{
    agent_id: string;
    agent_name: string;
    meeting_count: number;
  }>;
}

// API functions
const fetchAnalyticsData = async (periodStart?: string, periodEnd?: string): Promise<{ analytics: MeetingAnalyticsData[]; total_count: number }> => {
  const token = useAppStore.getState().authentication_state.auth_token;
  const params = new URLSearchParams();
  
  if (periodStart) params.append('period_start', periodStart);
  if (periodEnd) params.append('period_end', periodEnd);
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/meetings?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const fetchDashboardMetrics = async (dateRange?: string): Promise<DashboardMetrics> => {
  const token = useAppStore.getState().authentication_state.auth_token;
  const params = new URLSearchParams();
  
  if (dateRange) params.append('date_range', dateRange);
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/dashboard?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const exportAnalyticsReport = async (periodStart: string, periodEnd: string, format: 'pdf' | 'json' = 'pdf'): Promise<Blob> => {
  const token = useAppStore.getState().authentication_state.auth_token;
  const params = new URLSearchParams({
    period_start: periodStart,
    period_end: periodEnd,
  });
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/meetings?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    }
  );
  
  return response.data;
};

const UV_AnalyticsDashboard: React.FC = () => {
  // State management
  const [timePeriod, setTimePeriod] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0], // today
  });
  
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['total_meeting_time', 'action_item_completion_rate']);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago
    end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
  });
  
  const [exportFormat, setExportFormat] = useState<'pdf' | 'json'>('pdf');

  // Get current user for authentication
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Analytics data queries
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics', timePeriod.start, timePeriod.end],
    queryFn: () => fetchAnalyticsData(timePeriod.start, timePeriod.end),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: comparisonData, isLoading: comparisonLoading, error: comparisonError } = useQuery({
    queryKey: ['analytics-comparison', comparisonPeriod.start, comparisonPeriod.end],
    queryFn: () => fetchAnalyticsData(comparisonPeriod.start, comparisonPeriod.end),
    enabled: !!authToken && showComparison,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dashboardMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', timePeriod.start, timePeriod.end],
    queryFn: () => fetchDashboardMetrics('month'),
    enabled: !!authToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => exportAnalyticsReport(timePeriod.start, timePeriod.end, exportFormat),
    onSuccess: (data) => {
      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${timePeriod.start}-to-${timePeriod.end}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  // Process analytics data for charts
  const processedData = useMemo(() => {
    if (!analyticsData?.analytics) return null;

    const weeklyData = analyticsData.analytics.reduce((acc: any, item) => {
      const week = `Week ${Math.ceil(new Date(item.period_start).getDate() / 7)}`;
      if (!acc[week]) {
        acc[week] = {
          total_time: 0,
          completion_rate: 0,
          count: 0,
          sentiment: 0,
        };
      }
      
      acc[week].total_time += item.total_meeting_time || 0;
      acc[week].completion_rate += item.action_item_completion_rate || 0;
      acc[week].count += 1;
      
      // Parse sentiment if available
      if (item.meeting_sentiment_trends) {
        try {
          const sentiment = JSON.parse(item.meeting_sentiment_trends);
          if (sentiment.overall) {
            // Convert sentiment to numeric value (positive: 1, neutral: 0, negative: -1)
            const sentimentValue = sentiment.overall === 'positive' ? 1 : sentiment.overall === 'negative' ? -1 : 0;
            acc[week].sentiment += sentimentValue;
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      }
      
      return acc;
    }, {});

    const weeks = Object.keys(weeklyData);
    const averageTime = weeks.map(week => Math.round(weeklyData[week].total_time / 60)); // Convert to hours
    const averageCompletionRate = weeks.map(week => (weeklyData[week].completion_rate / weeklyData[week].count) * 100);
    const averageSentiment = weeks.map(week => weeklyData[week].sentiment / weeklyData[week].count);

    // Participation distribution
    const participationData = analyticsData.analytics.reduce((acc: any, item) => {
      if (item.participation_distribution) {
        try {
          const distribution = JSON.parse(item.participation_distribution);
          Object.entries(distribution).forEach(([participant, percentage]) => {
            acc[participant] = (acc[participant] || 0) + Number(percentage);
          });
        } catch (e) {
          // Invalid JSON, skip
        }
      }
      return acc;
    }, {});

    const participationLabels = Object.keys(participationData);
    const participationValues = Object.values(participationData).map((val: any) => val / analyticsData.analytics.length);

    return {
      weeklyTimeData: {
        labels: weeks,
        datasets: [
          {
            label: 'Average Meeting Time (hours)',
            data: averageTime,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      completionRateData: {
        labels: weeks,
        datasets: [
          {
            label: 'Completion Rate (%)',
            data: averageCompletionRate,
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      sentimentData: {
        labels: weeks,
        datasets: [
          {
            label: 'Sentiment Score',
            data: averageSentiment,
            backgroundColor: 'rgba(249, 115, 22, 0.6)',
            borderColor: 'rgba(249, 115, 22, 1)',
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      participationData: {
        labels: participationLabels,
        datasets: [
          {
            data: participationValues,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
            ],
            borderWidth: 2,
          },
        ],
      },
    };
  }, [analyticsData]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Meeting Analytics',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  // Handle time period change
  const handleTimePeriodChange = (start: string, end: string) => {
    setTimePeriod({ start, end });
  };

  // Handle export
  const handleExport = () => {
    exportMutation.mutate();
  };

  // Quick date range presets
  const quickRanges = [
    { label: 'Last 7 days', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    { label: 'Last 30 days', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    { label: 'Last 90 days', start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    { label: 'This month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Data-driven insights into your meeting effectiveness and productivity
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'json')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="json">JSON</option>
                </select>
                <button
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {exportMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Time Period Selector */}
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Time Period</h2>
                <p className="text-sm text-gray-600">Select date range for analytics</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleTimePeriodChange(range.start, range.end)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      timePeriod.start === range.start && timePeriod.end === range.end
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center space-x-4">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    id="start-date"
                    value={timePeriod.start}
                    onChange={(e) => setTimePeriod(prev => ({ ...prev, start: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    id="end-date"
                    value={timePeriod.end}
                    onChange={(e) => setTimePeriod(prev => ({ ...prev, end: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="comparison-toggle"
                    checked={showComparison}
                    onChange={(e) => setShowComparison(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="comparison-toggle" className="ml-2 block text-sm text-gray-700">
                    Show Comparison
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Period Selector */}
          {showComparison && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Comparison Period</h3>
                  <p className="text-sm text-yellow-700">Select date range to compare against current period</p>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="date"
                    value={comparisonPeriod.start}
                    onChange={(e) => setComparisonPeriod(prev => ({ ...prev, start: e.target.value }))}
                    className="border border-yellow-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  <span className="text-yellow-700">to</span>
                  <input
                    type="date"
                    value={comparisonPeriod.end}
                    onChange={(e) => setComparisonPeriod(prev => ({ ...prev, end: e.target.value }))}
                    className="border border-yellow-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {(analyticsLoading || metricsLoading) && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {analyticsError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading analytics data</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Failed to load analytics. Please try refreshing the page.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Overview */}
          {!analyticsLoading && dashboardMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Meetings Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 0V5a1 1 0 011-1h6a1 1 0 011 1v2" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Meetings</dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardMetrics.total_meetings}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Meeting Time Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Meeting Time</dt>
                        <dd className="text-lg font-medium text-gray-900">{Math.round(dashboardMetrics.total_meeting_time / 60)} hours</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Item Completion Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Action Item Completion</dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardMetrics.action_item_completion_rate?.toFixed(1) || 0}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Agents Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Agents</dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardMetrics.agent_usage?.length || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          {!analyticsLoading && processedData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Meeting Time Trend */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Time Trends</h3>
                <div className="h-64">
                  <Line data={processedData.weeklyTimeData} options={chartOptions} />
                </div>
              </div>

              {/* Participation Distribution */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Participation Distribution</h3>
                <div className="h-64">
                  <Doughnut data={processedData.participationData} options={doughnutOptions} />
                </div>
              </div>

              {/* Completion Rate */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Action Item Completion Rate</h3>
                <div className="h-64">
                  <Bar data={processedData.completionRateData} options={chartOptions} />
                </div>
              </div>

              {/* Sentiment Analysis */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Sentiment Trend</h3>
                <div className="h-64">
                  <Line data={processedData.sentimentData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Detailed Analytics */}
          {!analyticsLoading && analyticsData && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Detailed Analytics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sentiment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.analytics.map((item) => {
                      let sentimentText = 'Neutral';
                      let sentimentColor = 'text-yellow-600';
                      
                      if (item.meeting_sentiment_trends) {
                        try {
                          const sentiment = JSON.parse(item.meeting_sentiment_trends);
                          sentimentText = sentiment.overall || 'Neutral';
                          sentimentColor = sentiment.overall === 'positive' ? 'text-green-600' : sentiment.overall === 'negative' ? 'text-red-600' : 'text-yellow-600';
                        } catch (e) {
                          // Invalid JSON
                        }
                      }
                      
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.period_start).toLocaleDateString()} - {new Date(item.period_end).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Math.round((item.total_meeting_time || 0) / 60)} hours
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {((item.action_item_completion_rate || 0) * 100).toFixed(1)}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${sentimentColor}`}>
                            {sentimentText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!analyticsLoading && (!analyticsData || analyticsData.analytics.length === 0) && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
              <p className="mt-1 text-sm text-gray-500">Start having meetings to see your analytics data here.</p>
              <div className="mt-6">
                <Link
                  to="/meetings/setup"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Schedule a Meeting
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default UV_AnalyticsDashboard;