import React, { useState, useEffect } from 'react';
import { useUser } from '@stackframe/neon-auth';
import { SignIn, SignUp } from '@stackframe/neon-auth/react';

interface GV_AuthenticationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GV_AuthenticationModal: React.FC<GV_AuthenticationModalProps> = ({ isOpen, onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const user = useUser();

  // Clear form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setFullName('');
  setErrorMessage(null);
  }, [isOpen]);

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const toggleAuthMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrorMessage(null);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">
            {isLoginMode ? 'Sign In' : 'Create Account'}
          </h2>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            {/* Neon Auth Components */}
            {isLoginMode ? (
              <SignIn 
                onSuccess={() => {
                  onClose();
                }}
                onError={(error) => {
                  setErrorMessage(error.message || 'Authentication failed');
                }}
          />

          {/* Alternative: Manual forms if needed for custom styling */}
          <div className="hidden"> {/* Using Neon Auth components instead */}
            <div className="text-center">
              {errorMessage && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4"
                  aria-live="polite"
                >
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Social Auth Placeholders */}
              <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.25h6.26c-.3 1.5-1.5 3.5-3.5 4.5-2.5 0-3.06-1.25-3.5-3.5-3.5-2.25-5-5-2.75 0-5 2.25-5 5 0 .28 0 .55.03.81.13 1.15.44 2.19 1 3.44 1 5.25 0 9-4 9-9s-4-9-9-9c-4.97 0-9 4.03-9 9 0 5 4.03 9 9 9h9c5 0 9-4 9-9z" fill="#4285F4"></path>
                  </svg>
                  Continue with Google
                </button>
                
                <button
                  type="button"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="#f3f3f3"></path>
                  <path d="M12 0a12 12 0 1 0 0 24 0 24z" fill="#0078d4"></path>
                  </svg>
                  Continue with Microsoft
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>

                    <div className="text-center">
                      <span className="bg-white px-2 text-sm text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Manual Forms - Using Neon Auth components instead */}
                  <div className="text-center text-sm text-gray-600 mt-4">
                      {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                    </span>
                  </div>

                  {/* Email/Password Forms - Using Neon Auth components */}
                  <div>
                    {isLoginMode ? (
                      <SignIn 
                        onSuccess={() => {
                          onClose();
                        }}
                        onError={(error) => {
                          setErrorMessage(error.message || 'Authentication failed');
                    }}/> :
                    <SignUp 
                      onSuccess={() => {
                        onClose();
                      }}
                      onError={(error) => {
                        setErrorMessage(error.message || 'Registration failed');
                      }}
                  /> :
                      <SignUp 
                        onSuccess={() => {
                          onClose();
                        }}
                        onError={(error) => {
                          setErrorMessage(error.message || 'Registration failed');
                    }}
                  />
                </div>

                {/* Toggle Mode Link */}
                <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={toggleAuthMode}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
                >
                  {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                    </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-center">
                    <button
                      type="button"
                      className="text-gray-600 hover:text-gray-500 text-sm transition-colors"
                  >
                    {isLoginMode ? 'Forgot your password?' : 'Switch to sign in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GV_AuthenticationModal;