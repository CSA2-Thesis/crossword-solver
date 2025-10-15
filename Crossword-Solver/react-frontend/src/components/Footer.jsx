import React from "react";
import { Link } from "react-router-dom";
import { FaTwitter, FaGithub } from "react-icons/fa";

const Footer = ({ variant = "default", className = "" }) => {
  if (variant === "simple") {
    return (
      <footer className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-md py-6 border-t border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} Puzzly Logic. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`bg-[#F2F0EF]/90 dark:bg-gray-900/90 backdrop-blur-md py-8 sm:py-10 lg:py-12 ${className}`}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        {/* Main footer content - responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* Brand section - full width on mobile */}
          <div className="sm:col-span-2 lg:col-span-1 mb-4 sm:mb-0">
            <div className="flex items-center mb-3">
              <img 
                src="/puzzlyLogic.png" 
                alt="Puzzly Logic Logo" 
                className="h-8 w-8 mr-3"
              />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Puzzly Logic
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
              Exploring the boundaries of algorithmic performance through solving crossword puzzles.
            </p>
          </div>
          
          {/* Navigation - responsive columns */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/generate" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Create Puzzle
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Analytics
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="https://github.com/CSA2-Thesis/crossword-solver" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>
          
          {/* Legal & Social - combined on mobile */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors">
                  Contact
                </a>
              </li>
            </ul>
            
            {/* Social links - visible on mobile too */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 sm:hidden">
              <div className="flex space-x-4">
                <SocialLink href="#" icon={<FaTwitter />} label="Twitter" />
                <SocialLink href="https://github.com/CSA2-Thesis/crossword-solver" icon={<FaGithub />} label="GitHub" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section - responsive layout */}
        <div className="pt-6 lg:pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center sm:text-left">
              © {new Date().getFullYear()} Puzzly Logic. All rights reserved.
            </p>
            
            {/* Social links - hidden on mobile, visible on larger screens */}
            <div className="hidden sm:flex space-x-6">
              <SocialLink href="#" icon={<FaTwitter />} label="Twitter" />
              <SocialLink href="https://github.com/CSA2-Thesis/crossword-solver" icon={<FaGithub />} label="GitHub" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Reusable social link component
const SocialLink = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
    aria-label={label}
  >
    <span className="sr-only">{label}</span>
    <div className="w-5 h-5">
      {icon}
    </div>
  </a>
);

export default Footer;