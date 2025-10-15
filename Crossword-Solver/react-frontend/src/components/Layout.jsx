import { Outlet, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, useRef } from "react";
import Body from "./Body";
import Footer from "./Footer";
import { FiSun, FiMoon, FiSettings, FiMenu, FiX } from "react-icons/fi";

function Layout() {
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.remove("text-sm", "text-base", "text-lg");
    document.documentElement.classList.add(
      fontSize === "small" ? "text-sm" : fontSize === "large" ? "text-lg" : "text-base"
    );
  }, [fontSize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [window.location.pathname]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);
    document.documentElement.classList.toggle("dark", storedTheme === "dark");
  }, []);

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    setShowSettingsDropdown(false);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Background layers */}
      <div className="fixed inset-0 -z-50">
        <Body />
      </div>
      <div className="fixed inset-0 -z-40 pointer-events-none">
        <div className="absolute inset-0 bg-white/10 dark:bg-gray-800/10 backdrop-blur-md" />
      </div>

      {/* Main content structure */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Mobile-optimized Header */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
            <div className="flex justify-between h-14 sm:h-16 items-center">
              {/* Logo - responsive sizing */}
              <Link
                to="/"
                className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex-shrink-0 flex items-center"
              >
                <img 
                  src="/puzzlyLogic.png" 
                  alt="Puzzly Logic Logo" 
                  className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3"
                />
                <span className="text-blue-600 dark:text-blue-400">Puzzly </span>Logic
              </Link>

              {/* Desktop Navigation - hidden on mobile */}
              <div className="hidden md:flex justify-center flex-1">
                <div className="flex items-center gap-4 lg:gap-8">
                  <NavLink to="/generate">Create Puzzle</NavLink>
                  <NavLink to="/analytics">Analytics</NavLink>
                  <NavLink to="/about">About</NavLink>
                </div>
              </div>

              {/* Mobile Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Theme Toggle - smaller on mobile */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 sm:p-2 rounded-full text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Toggle dark mode"
                >
                  <div className="relative w-4 h-4 sm:w-5 sm:h-5">
                    <FiMoon
                      size={16}
                      className={`absolute transition-all duration-500 ease-in-out ${
                        theme === "dark"
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 rotate-180 scale-0"
                      }`}
                    />
                    <FiSun
                      size={16}
                      className={`absolute transition-all duration-500 ease-in-out ${
                        theme === "light"
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 -rotate-180 scale-0"
                      }`}
                    />
                  </div>
                </button>
                
                {/* Settings Dropdown - smaller on mobile */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="p-1.5 sm:p-2 rounded-full text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Settings"
                  >
                    <FiSettings size={16} className="sm:w-5 sm:h-5" />
                  </button>

                  {/* Responsive dropdown - full width on mobile */}
                  <div
                    className={`absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-1rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700 transform transition-all duration-200 ease-out origin-top-right ${
                      showSettingsDropdown
                        ? "opacity-100 scale-100 pointer-events-auto"
                        : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Font Size
                      </div>
                      <button
                        onClick={() => handleFontSizeChange("small")}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                          fontSize === "small"
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        Small
                      </button>
                      <button
                        onClick={() => handleFontSizeChange("medium")}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                          fontSize === "medium"
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        Medium
                      </button>
                      <button
                        onClick={() => handleFontSizeChange("large")}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                          fontSize === "large"
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        Large
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Menu Button - only visible on mobile */}
                <button
                  onClick={toggleMobileMenu}
                  className="md:hidden p-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Toggle menu"
                >
                  {showMobileMenu ? <FiX size={20} /> : <FiMenu size={20} />}
                </button>
              </div>
            </div>
          </nav>

          {/* Mobile Navigation Menu */}
          <div
            ref={mobileMenuRef}
            className={`md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-out origin-top ${
              showMobileMenu
                ? "opacity-100 scale-y-100 pointer-events-auto"
                : "opacity-0 scale-y-95 pointer-events-none"
            }`}
          >
            <div className="px-4 py-3 space-y-1">
              <MobileNavLink to="/generate" onClick={() => setShowMobileMenu(false)}>
                Create Puzzle
              </MobileNavLink>
              <MobileNavLink to="/analytics" onClick={() => setShowMobileMenu(false)}>
                Analytics
              </MobileNavLink>
              <MobileNavLink to="/about" onClick={() => setShowMobileMenu(false)}>
                About
              </MobileNavLink>
            </div>
          </div>
        </header>

        {/* Main content - mobile optimized */}
        <main className="flex-1 relative">
          <div className="absolute inset-0 bg-white/5 dark:bg-gray-800/5 backdrop-blur-sm pointer-events-none" />
          
          <div className="relative z-10 min-h-screen overflow-y-auto custom-scrollbar">
            <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
              <Outlet />
            </div>
          </div>
        </main>


        <Footer variant="default" className="relative z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700"/>

      </div>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'text-sm sm:text-base',
          style: {
            maxWidth: 'calc(100vw - 2rem)',
            wordBreak: 'break-word',
          },
        }}
      />
    </div>
  );
}

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
  >
    {children}
  </Link>
);

const MobileNavLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-3 py-2.5 text-base text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
  >
    {children}
  </Link>
);

export default Layout;