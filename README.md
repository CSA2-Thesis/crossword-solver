Before anything else, to access the application, the user must have the following prerequisite installations before installing the application.
====================================================
Prerequisites:

1.	Python - the user is required to have the Python programming language version 3.13 and above installed beforehand. If in the case that the user does not meet this prerequisite, it is advised that the user follows the following steps:
    a.	Go to python.org.
    b.	Navigate to the Downloads page and download the Windows version of the Python Installer with versions higher or equal to 3.13.x
    c.	Run the installer using the default installation settings:
    d. Access the command prompt and enter “python --version” and “pip --version” to verify the installment of the Python language.

2.	Node.js – the user is also required to have the Node.js environment for the frontend of the software. In the case that the user also does not meet this prerequisite, it is advised to do the following steps:
    a.	Go to nodejs.org.
    b.	Navigate to the Download page and install the Windows Installer (recommended) version 22.x and above.
    c.	Run the installer with the default setup settings.
    d.	Access the command prompt and enter “node --version” and “npm --version” to verify the installment of the Python language. 

After installing the prerequisites, the user is free to move on to the actual installation of the system.
=====================================================================

Installation
    1.	Install and unzip the application from the disk.
    2.	Install the dependencies of the backend by opening a terminal in the flask-backend folder and run “pip install -r requirements.txt”.
    3.	Open another terminal in the react-frontend folder and run “npm i” or “npm install” to install all dependencies in the frontend.
    4.	Run the backend and frontend by entering “py server.py” and “npm run dev” in their respective root folders. If things run smoothly, the console should look like the following:
