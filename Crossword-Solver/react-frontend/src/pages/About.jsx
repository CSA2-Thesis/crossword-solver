import React from "react";

const About = () => {
  const teamMembers = [
    {
      id: 1,
      name: "Queency Santos",
      role: "Project Manager",
      image: "/Santos.png",
      socials: {
        github: "https://github.com/kwinsiii23",
        linkedin: "https://www.linkedin.com/in/queency-zyrel-santos-280426378/",
        facebook: "https://www.facebook.com/queencyzyrelsantos ",
      },
    },
    {
      id: 2,
      name: "Patrick Sios-e",
      role: "Frontend Developer",
      image: "/Sios-e.png",
      socials: {
        github: "https://github.com/Siose-Patrick",
        linkedin: "https://www.linkedin.com/in/patrick-sios-e-1a397817a/",
        facebook: "https://www.facebook.com/patrick.siose/",
      },
    },
    {
      id: 3,
      name: "Xyro Casa",
      role: "Backend Developer",
      image: "/Casa.png",
      socials: {
        github: "https://github.com/Xy-Home0",
        linkedin: "https://www.linkedin.com/in/king-xyro-casa-981598262/",
        facebook: "https://www.facebook.com/hoomeee",
      },
    },
    {
      id: 4,
      name: "Katrina Villalon",
      role: "UI/UX Designer",
      image: "/Villalon.png",
      socials: {
        github: "https://github.com/HydeJekyll",
        linkedin: "https://www.linkedin.com/in/katrina-paula-villalon-823617181/",
        facebook: "https://www.facebook.com/katrina.villalon14",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/10 to-blue-100/10 dark:from-gray-800/10 dark:to-gray-900/10 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-700/50 p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 ">
            Meet the Team
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 ">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-gray-700/50 overflow-hidden transition-transform hover:scale-105 flex flex-col"
              >
                <div className="relative pt-[100%]">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-6 text-center flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-semibold rounded-full mb-4">
                    {member.role}
                  </span>
                  <div className="mt-auto flex justify-center space-x-4">
                    {/* GitHub */}
                    <a
                      href={member.socials.github}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>

                    {/* LinkedIn */}
                    <a
                      href={member.socials.linkedin}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V24h-4V8zM8.5 8h3.8v2.2h.05c.53-1 1.83-2.2 3.75-2.2 4 0 4.9 2.6 4.9 6v9.9h-4v-8.8c0-2.1-.04-4.8-2.9-4.8-2.9 0-3.3 2.3-3.3 4.7V24h-4V8z" />
                      </svg>
                    </a>

                    {/* Facebook */}
                    <a
                      href={member.socials.facebook}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Solve Some Puzzles?
          </h2>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
