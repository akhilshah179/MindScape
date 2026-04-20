# 🎓 StudyMate AI

StudyMate AI is a production-grade, full-stack productivity and learning platform. It empowers students with AI-driven study tools, seamless file sharing, and robust analytics to optimize their academic performance. 

The application is built with a sleek, modern React frontend and a secure, scalable Node.js + Express backend.

---

## ✨ Features

- **🤖 AI-Powered Chat & Quizzes:** Interactive learning assistant powered by the Groq API to summarize notes, answer questions, and generate dynamic quizzes.
- **📁 Secure File Sharing:** Upload and share study materials seamlessly with auto-expiring AWS S3 secure URLs.
- **📊 Analytics Hub:** Track your study progress, AI usage, and learning metrics through a beautiful, visually engaging dashboard.
- **⏱️ Productivity Dashboard:** Manage your time efficiently with built-in productivity tools and session trackers.
- **🔒 Secure Authentication:** Robust user authentication and session management using AWS Cognito / DynamoDB integrations.
- **📱 Responsive UI:** A sober, modern, and fully responsive user interface featuring glassmorphism and smooth animations.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **Git**

### 2. Environment Setup
The project uses a single unified `.env` file at the root directory. Ensure you have your `.env` file configured in the root `studymate (2)/` folder with the necessary AWS and Groq API keys.

### 3. Installation
Navigate to the root directory of the project and install all necessary dependencies for both the frontend and backend:

```bash
# Install dependencies for both environments
npm run install:all
```
*(If you do not have the `install:all` script configured, run `npm install` inside both the `studymate` and `backend` folders separately).*

### 4. Start the Application
You can run both the frontend and the backend concurrently from the root directory:

```bash
# Starts both the Vite React app and the Express server
npm run dev
```

- **Frontend:** Typically accessible at `http://localhost:5173`
- **Backend API:** Typically running at `http://localhost:5000`

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, AWS Amplify
- **Backend:** Node.js, Express.js, AWS S3, Groq API
