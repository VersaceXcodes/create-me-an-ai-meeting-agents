import React from 'react';
import { Link } from 'react-router-dom';

const GV_BottomFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-gray-800 text-white py-8 px-4 md:px-8 border-t border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Branding */}
            <div className="col-span-1 md:col-span-2">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
          <div>
            <h3 className="text-xl font-bold">MeetMate AI</h3>
            <p className="text-gray-300 mt-2">
              Intelligent Meeting Companions for Maximum Productivity
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-200">Quick Links</h4>
          <ul className="space-y-1">
            <li>
              <Link 
                to="/about" 
                className="text-gray-400 hover:text-white transition-colors text-sm">
              About
            </Link>
          </li>
          <li>
            <Link 
              to="/privacy-policy" 
              className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link 
                to="/terms-of-service" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Terms of Service
              </Link>
            </li>
          <li>
            <Link 
              to="/support" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Support
            </Link>
          </li>
        </ul>
      </div>
      
      {/* Legal & Contact */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-200">Legal & Contact</h4>
      <ul className="space-y-1">
        <li>
          <Link 
            to="/support" 
            className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Social Media Links */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-200">Connect With Us</h4>
        <div className="flex space-x-4">
          <a 
            href="https://twitter.com/meetmateai" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-blue-400 transition-colors"
            fill="currentColor" 
            viewBox="0 0 24 24"
            className="w-5 h-5 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-2.15-.92A10.87 10.87 0 0123 3z"></path>
          </svg>
        </a>
        <a 
          href="https://linkedin.com/company/meetmateai" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-blue-700 transition-colors"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-2.573-.815-3.328-.791-1.835-1.537-3.328-3.328-1.791-3.328-4.14 0a10.725 10.725 0 004.258 4.258z"></path>
          </svg>
        </a>
        <a 
          href="https://facebook.com/meetmateai" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-6.627 0-12 5.373 12 12-5.373 12-12S29.627 0 23 0 12.073 0 12 5.373 12 12z"></path>
          </svg>
        </a>
        <a 
          href="https://instagram.com/meetmateai" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.99.07 2.51 1.47 4.66 3.42 7.78 5.537 12.073 0 12 5.373 12 12-5.373 12-12S17.627 0 12 0 2.163 0 3.584.012 4.99.07 2.51 1.47 4.66 3.42 7.78 5.537 12.073 0 12 5.373 12 12-5.373 12-12S20.373 0 12 0z"></path>
          </svg>
        </a>
      </div>
      
      {/* Copyright */}
      <div className="col-span-1 md:col-span-4 border-t border-gray-700 pt-6 mt-6">
              <p className="text-gray-400 text-sm">
                &copy; {currentYear} MeetMate AI. All rights reserved.
      </p>
    </div>
  </div>
</footer>
</>
);
};

export default GV_BottomFooter;