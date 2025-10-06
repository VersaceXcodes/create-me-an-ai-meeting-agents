import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Types for form data and validation
interface RegistrationFormData {
  email: string;
  password: string;
  full_name: string;
  profile_picture_url: string | null;
  terms_accepted: boolean;
  privacy_accepted: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

interface PasswordStrength {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  score: number; // 0-4
}

const UV_Registration: React.FC = () => {
  const navigate = useNavigate();
  const registerUser = useAppStore(state => state.register_user);
  
  // Local state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    full_name: '',
    profile_picture_url: null,
    terms_accepted: false,
    privacy_accepted: false,
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [verificationCountdown, setVerificationCountdown] = useState<number>(0);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasNumber: false,
    hasSpecialChar: false,
    score: 0,
  });

  // Check if user is already authenticated
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Email validation mutation
  const emailValidationMutation = useMutation({
    mutationFn: async (email: string) => {
      // Check email format first
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // In a real implementation, we would check if email exists
      // For now, we'll simulate a check that always passes for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      return { available: true };
    },
    onError: (error: any) => {
      setValidationErrors(prev => [
        ...prev.filter(e => e.field !== 'email'),
        { field: 'email', message: error.message }
      ]);
    }
  });

  // Registration mutation
  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
        {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          profile_picture_url: data.profile_picture_url,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Call the store's register_user action to update global state
      registerUser(
        formData.email,
        formData.password,
        formData.full_name,
        formData.profile_picture_url
      );
      
      // Move to email verification step
      setCurrentStep(4);
      startVerificationCountdown();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setValidationErrors(prev => [
        ...prev.filter(e => e.field !== 'general'),
        { field: 'general', message: errorMessage }
      ]);
    },
  });

  // Start verification countdown timer
  const startVerificationCountdown = () => {
    setVerificationCountdown(60); // 60 seconds
    const timer = setInterval(() => {
      setVerificationCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Validate password strength
  const validatePassword = (password: string): PasswordStrength => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let score = 0;
    if (hasMinLength) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;
    if (password.length >= 12) score++; // Bonus for longer passwords
    
    return {
      hasMinLength,
      hasNumber,
      hasSpecialChar,
      score,
    };
  };

  // Handle input changes
  const handleInputChange = (field: keyof RegistrationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation errors for this field when user starts typing
    setValidationErrors(prev => prev.filter(error => error.field !== field));
    
    // Special validation for email and password
    if (field === 'email' && typeof value === 'string') {
      // Real-time email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'email'),
          { field: 'email', message: 'Please enter a valid email address' }
        ]);
      } else if (value && emailRegex.test(value)) {
        setValidationErrors(prev => prev.filter(e => e.field !== 'email'));
      }
    }
    
    if (field === 'password' && typeof value === 'string') {
      setPasswordStrength(validatePassword(value));
    }
  };

  // Handle step navigation
  const goToNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.email) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'email'),
          { field: 'email', message: 'Email is required' }
        ]);
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'email'),
          { field: 'email', message: 'Please enter a valid email address' }
        ]);
        return;
      }
      
      // Check email availability
      emailValidationMutation.mutate(formData.email);
    }
    
    if (currentStep === 2) {
      if (!formData.password) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'password'),
          { field: 'password', message: 'Password is required' }
        ]);
        return;
      }
      
      if (passwordStrength.score < 2) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'password'),
          { field: 'password', message: 'Please choose a stronger password' }
        ]);
        return;
      }
    }
    
    if (currentStep === 3) {
      if (!formData.full_name) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'full_name'),
          { field: 'full_name', message: 'Full name is required' }
        ]);
        return;
      }
      
      if (!formData.terms_accepted || !formData.privacy_accepted) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== 'terms'),
          { field: 'terms', message: 'You must accept both Terms of Service and Privacy Policy' }
        ]);
        return;
      }
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 3) {
      registrationMutation.mutate(formData);
    }
  };

  // Get error message for a specific field
  const getFieldError = (field: string): string | null => {
    return validationErrors.find(error => error.field === field)?.message || null;
  };

  // Password strength color
  const getPasswordStrengthColor = (score: number): string => {
    if (score === 0) return 'bg-gray-200';
    if (score === 1) return 'bg-red-500';
    if (score === 2) return 'bg-yellow-500';
    if (score === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Password strength text
  const getPasswordStrengthText = (score: number): string => {
    if (score === 0) return 'Enter a password';
    if (score === 1) return 'Very Weak';
    if (score === 2) return 'Weak';
    if (score === 3) return 'Good';
    return 'Strong';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">MM</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">MeetMate AI</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join thousands of professionals using AI meeting assistants
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step}
                    </div>
                    <span className="text-xs mt-1 text-gray-500">
                      {step === 1 && 'Email'}
                      {step === 2 && 'Password'}
                      {step === 3 && 'Details'}
                      {step === 4 && 'Verify'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-1 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* General Error Message */}
            {getFieldError('general') && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="text-sm">{getFieldError('general')}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Email Input */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => {
                          if (formData.email) {
                            emailValidationMutation.mutate(formData.email);
                          }
                        }}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          getFieldError('email') ? 'border-red-300' : 'border-gray-300'
                        } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter your email address"
                      />
                    </div>
                    {getFieldError('email') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                    )}
                    {emailValidationMutation.isLoading && (
                      <p className="mt-1 text-sm text-blue-600">Checking email availability...</p>
                    )}
                    {emailValidationMutation.isSuccess && !getFieldError('email') && (
                      <p className="mt-1 text-sm text-green-600">Email is available!</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={goToNextStep}
                      disabled={!formData.email || !!getFieldError('email') || emailValidationMutation.isLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Password Creation */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Create password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          getFieldError('password') ? 'border-red-300' : 'border-gray-300'
                        } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Create a strong password"
                      />
                    </div>
                    
                    {/* Password Strength Meter */}
                    <div className="mt-2">
                      <div className="flex space-x-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 h-2 rounded ${
                              passwordStrength.score >= level
                                ? getPasswordStrengthColor(passwordStrength.score)
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600">
                        Strength: {getPasswordStrengthText(passwordStrength.score)}
                      </p>
                    </div>

                    {/* Password Requirements */}
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      <div className={`flex items-center ${passwordStrength.hasMinLength ? 'text-green-600' : ''}`}>
                        <span className={`w-4 h-4 mr-1 ${passwordStrength.hasMinLength ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordStrength.hasMinLength ? '✓' : '○'}
                        </span>
                        At least 8 characters
                      </div>
                      <div className={`flex items-center ${passwordStrength.hasNumber ? 'text-green-600' : ''}`}>
                        <span className={`w-4 h-4 mr-1 ${passwordStrength.hasNumber ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordStrength.hasNumber ? '✓' : '○'}
                        </span>
                        At least one number
                      </div>
                      <div className={`flex items-center ${passwordStrength.hasSpecialChar ? 'text-green-600' : ''}`}>
                        <span className={`w-4 h-4 mr-1 ${passwordStrength.hasSpecialChar ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordStrength.hasSpecialChar ? '✓' : '○'}
                        </span>
                        At least one special character
                      </div>
                    </div>

                    {getFieldError('password') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={goToNextStep}
                      disabled={!formData.password || !!getFieldError('password') || passwordStrength.score < 2}
                      className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Personal Details & Terms */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                      Full name
                    </label>
                    <div className="mt-1">
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        autoComplete="name"
                        required
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          getFieldError('full_name') ? 'border-red-300' : 'border-gray-300'
                        } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    {getFieldError('full_name') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('full_name')}</p>
                    )}
                  </div>

                  {/* Optional Profile Picture URL */}
                  <div>
                    <label htmlFor="profile_picture_url" className="block text-sm font-medium text-gray-700">
                      Profile picture URL (optional)
                    </label>
                    <div className="mt-1">
                      <input
                        id="profile_picture_url"
                        name="profile_picture_url"
                        type="url"
                        value={formData.profile_picture_url || ''}
                        onChange={(e) => handleInputChange('profile_picture_url', e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>
                  </div>

                  {/* Terms and Privacy */}
                  <div className="space-y-3">
                    <div className={`flex items-start ${getFieldError('terms') ? 'text-red-600' : ''}`}>
                      <div className="flex items-center h-5">
                        <input
                          id="terms_accepted"
                          name="terms_accepted"
                          type="checkbox"
                          checked={formData.terms_accepted}
                          onChange={(e) => handleInputChange('terms_accepted', e.target.checked)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="terms_accepted" className="font-medium text-gray-700">
                          I accept the{' '}
                          <a href="#" className="text-blue-600 hover:text-blue-500 underline">
                            Terms of Service
                          </a>
                        </label>
                      </div>
                    </div>

                    <div className={`flex items-start ${getFieldError('terms') ? 'text-red-600' : ''}`}>
                      <div className="flex items-center h-5">
                        <input
                          id="privacy_accepted"
                          name="privacy_accepted"
                          type="checkbox"
                          checked={formData.privacy_accepted}
                          onChange={(e) => handleInputChange('privacy_accepted', e.target.checked)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="privacy_accepted" className="font-medium text-gray-700">
                          I accept the{' '}
                          <a href="#" className="text-blue-600 hover:text-blue-500 underline">
                            Privacy Policy
                          </a>
                        </label>
                      </div>
                    </div>

                    {getFieldError('terms') && (
                      <p className="text-sm text-red-600">{getFieldError('terms')}</p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={registrationMutation.isLoading || !formData.full_name || !formData.terms_accepted || !formData.privacy_accepted}
                      className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {registrationMutation.isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        'Create account'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Email Verification */}
              {currentStep === 4 && (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Verify your email address
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      We've sent a verification link to <strong>{formData.email}</strong>
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Click the link in the email to verify your account and get started with MeetMate AI.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Continue to Login
                    </button>

                    <div className="text-sm">
                      <p className="text-gray-600">
                        Didn't receive the email?{' '}
                        <button
                          type="button"
                          onClick={startVerificationCountdown}
                          disabled={verificationCountdown > 0}
                          className="text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verificationCountdown > 0 
                            ? `Resend in ${verificationCountdown}s`
                            : 'Resend verification email'
                          }
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Already have an account link */}
            {currentStep !== 4 && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Registration;