import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const UV_PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract token from URL params if present
  const urlToken = searchParams.get('token');
  
  // State variables
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState(urlToken || '');
  const [currentStep, setCurrentStep] = useState(urlToken ? 'reset' : 'request');
  const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Get store actions
  const requestPasswordReset = useAppStore(state => state.request_password_reset);
  const resetPassword = useAppStore(state => state.reset_password);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  
  // Effect to handle token from URL
  useEffect(() => {
    if (urlToken) {
      setResetToken(urlToken);
      setCurrentStep('reset');
    }
  }, [urlToken]);
  
  // Password reset request mutation
  const requestResetMutation = useMutation({
    mutationFn: async (email: string) => {
      setIsLoading(true);
      setValidationErrors([]);
      
      try {
        await requestPasswordReset(email);
        return true;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      setSuccessMessage('Password reset email sent! Check your inbox for further instructions.');
      setValidationErrors([]);
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to send reset email';
      setValidationErrors([{ field: 'email', message: errorMessage }]);
    }
  });
  
  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      setIsLoading(true);
      setValidationErrors([]);
      
      try {
        await resetPassword(token, password);
        return true;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      setSuccessMessage('Password successfully reset! Redirecting to login...');
      setValidationErrors([]);
      
      // Redirect to login after successful reset
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to reset password';
      setValidationErrors([{ field: 'token', message: errorMessage }]);
    }
  });
  
  // Validate password strength
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  // Handle step 1: Request password reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setValidationErrors([]);
    
    if (!email.trim()) {
      setValidationErrors([{ field: 'email', message: 'Email is required' }]);
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationErrors([{ field: 'email', message: 'Please enter a valid email address' }]);
      return;
    }
    
    requestResetMutation.mutate(email);
  };
  
  // Handle step 2: Reset password with token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setValidationErrors([]);
    
    const errors: { field: string; message: string }[] = [];
    
    // Validate token
    if (!resetToken.trim()) {
      errors.push({ field: 'token', message: 'Reset token is required' });
    }
    
    // Validate password
    if (!newPassword.trim()) {
      errors.push({ field: 'newPassword', message: 'New password is required' });
    } else {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        passwordValidation.errors.forEach(error => {
          errors.push({ field: 'newPassword', message: error });
        });
      }
    }
    
    // Validate password confirmation
    if (!confirmPassword.trim()) {
      errors.push({ field: 'confirmPassword', message: 'Please confirm your new password' });
    } else if (newPassword !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    resetPasswordMutation.mutate({ token: resetToken, password: newPassword });
  };
  
  // Clear specific field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    setValidationErrors(prev => prev.filter(error => error.field !== fieldName));
  };
  
  // Get error message for specific field
  const getFieldError = (fieldName: string): string | null => {
    const error = validationErrors.find(error => error.field === fieldName);
    return error ? error.message : null;
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center bg-blue-100 rounded-full">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {currentStep === 'request' ? 'Reset your password' : 'Create new password'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {currentStep === 'request' 
                ? "Enter your email and we'll send you a reset link" 
                : 'Enter your reset token and create a new password'
              }
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Step 1: Request Password Reset */}
          {currentStep === 'request' && (
            <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      clearFieldError('email');
                      setEmail(e.target.value);
                    }}
                    className={`mt-1 relative block w-full px-3 py-2 border ${
                      getFieldError('email') ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter your email address"
                  />
                  {getFieldError('email') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending reset link...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Reset Password */}
          {currentStep === 'reset' && (
            <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="resetToken" className="block text-sm font-medium text-gray-700">
                    Reset Token
                  </label>
                  <input
                    id="resetToken"
                    name="resetToken"
                    type="text"
                    value={resetToken}
                    onChange={(e) => {
                      clearFieldError('token');
                      setResetToken(e.target.value);
                    }}
                    className={`mt-1 relative block w-full px-3 py-2 border ${
                      getFieldError('token') ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter the reset token from your email"
                  />
                  {getFieldError('token') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('token')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => {
                      clearFieldError('newPassword');
                      setNewPassword(e.target.value);
                    }}
                    className={`mt-1 relative block w-full px-3 py-2 border ${
                      getFieldError('newPassword') ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter your new password"
                  />
                  {getFieldError('newPassword') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('newPassword')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      clearFieldError('confirmPassword');
                      setConfirmPassword(e.target.value);
                    }}
                    className={`mt-1 relative block w-full px-3 py-2 border ${
                      getFieldError('confirmPassword') ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Confirm your new password"
                  />
                  {getFieldError('confirmPassword') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                      <svg className={`h-3 w-3 mr-1 ${newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      At least 8 characters long
                    </li>
                    <li className={`flex items-center ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <svg className={`h-3 w-3 mr-1 ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Contains at least one lowercase letter
                    </li>
                    <li className={`flex items-center ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <svg className={`h-3 w-3 mr-1 ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Contains at least one uppercase letter
                    </li>
                    <li className={`flex items-center ${/(?=.*\d)/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <svg className={`h-3 w-3 mr-1 ${/(?=.*\d)/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Contains at least one number
                    </li>
                    <li className={`flex items-center ${/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <svg className={`h-3 w-3 mr-1 ${/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Contains at least one special character
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting password...
                    </span>
                  ) : (
                    'Reset password'
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep('request')}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Need a new reset token?
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_PasswordReset;