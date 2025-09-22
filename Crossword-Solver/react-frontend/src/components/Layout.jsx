import { Outlet, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, useRef } from "react";
import Body from "./Body";
import Footer from "./Footer";
import { FiSun, FiMoon, FiSettings } from "react-icons/fi";

function Layout() {
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.remove(
      "text-sm",
      "text-base",
      "text-lg"
    );
    document.documentElement.classList.add(
      fontSize === "small"
        ? "text-sm"
        : fontSize === "large"
        ? "text-lg"
        : "text-base"
    );
  }, [fontSize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  return (
    <div className="relative min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="fixed inset-0 -z-10">
        <Body />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20 dark:bg-gray-800/90 dark:border-gray-700">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">

              <Link
                to="/"
                className="text-xl font-bold text-gray-900 dark:text-white flex-shrink-0 flex"
              >
                <img 
                  src="/puzzlyLogic.png" 
                  alt="Puzzly Logic Logo" 
                  className="h-8 w-8 mr-4"
                />
                <span className="text-blue-600 dark:text-blue-400">Puzzly </span>Logic
              </Link>

              <div className="hidden md:flex justify-center flex-1">
                <div className="flex items-center gap-8">
                  <NavLink to="/generate">Create Puzzle</NavLink>
                  <NavLink to="/analytics">Analytics</NavLink>
                  <NavLink to="/about">About</NavLink>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Toggle dark mode"
                >
                  <div className="relative w-5 h-5">
                    <FiMoon
                      size={20}
                      className={`absolute transition-all duration-500 ease-in-out ${
                        theme === "dark"
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 rotate-180 scale-0"
                      }`}
                    />
                    <FiSun
                      size={20}
                      className={`absolute transition-all duration-500 ease-in-out ${
                        theme === "light"
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 -rotate-180 scale-0"
                      }`}
                    />
                  </div>
                </button>
                
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() =>
                      setShowSettingsDropdown(!showSettingsDropdown)
                    }
                    className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Settings"
                  >
                    <FiSettings size={20} />
                  </button>

                  <div
                    className={`absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-30 border border-gray-200 dark:border-gray-700 transform transition-all duration-200 ease-out origin-top-right ${
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

                <MobileMenu />
              </div>
            </div>
          </nav>
        </header>

        <main className="flex-1 bg-white/10 dark:bg-gray-800/10 backdrop-blur-md">
          <Outlet />
        </main>
        {/* <Footer variant="simple" className="-mt-17"/> */}
        <Footer variant="default" className="-m-77"/>
      </div>

      <Toaster position="bottom-right" />
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

const MobileMenu = () => (
  <div className="md:hidden">{/* To be implemented */}</div>
);

export default Layout;