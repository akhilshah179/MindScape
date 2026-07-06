# 🎓 StudyMate AI — The Complete Student Operating System

**StudyMate AI** is a production-grade, full-stack academic productivity platform that unifies AI-powered learning, a competitive coding arena, real-time video meetings, smart file management, and deep analytics into a single cohesive dashboard. Designed as a "Student OS," it empowers learners to study smarter, code better, and collaborate seamlessly — all from one place.

Built with **React 19 + Vite** on the frontend, **Node.js + Express** on the backend, and backed by **AWS cloud services** for enterprise-grade security and scale.

---

## 📖 About the Project

StudyMate was built to solve common student pain points: scattered notes, inefficient study sessions, the lack of personalized tutoring, and the hassle of switching between multiple tools. By bringing everything into one unified dashboard, StudyMate acts as a **personal AI tutor**, a **LeetCode-style coding arena**, a **video meeting room**, a **file manager**, and a **productivity coach** — all at once.

It leverages blazing-fast AI inference through the **Groq API** (Llama 3.3 70B) for instant assistance, **Judge0 CE** for remote code execution, **LiveKit** for real-time video/audio meetings, and **AWS** for authentication, storage, and database services.

---

## ✨ Comprehensive Feature Breakdown

### 🤖 AI-Powered Learning Hub (`/ai`)

A full-featured ChatGPT-style AI assistant purpose-built for students:

- **Multi-Chat Management** — Create, rename, search, and delete unlimited chat conversations with auto-generated titles. All chats are persisted in DynamoDB.
- **Groq-Powered Responses** — Ultra-fast AI responses powered by `llama-3.3-70b-versatile` via the Groq API with markdown rendering (code blocks, headings, lists, inline formatting).
- **PDF Context Chat** — Upload a PDF, extract text client-side using PDF.js, and ask AI questions grounded in the document content.
- **AI Memory System** — Teach the AI about yourself (name, learning style, goals). Memory items are stored per-user in DynamoDB and automatically injected into every AI conversation for personalized responses.
- **Prompt Library** — Pre-built prompt templates for common study tasks (summarize, explain, quiz me, compare topics, etc.) to accelerate workflows.
- **Chat History Sidebar** — Grouped by time period (Today, Yesterday, Last 7 Days, Older) with search, rename, and delete capabilities.

### 💻 Coding Arena (`/coding`)

A complete LeetCode-style competitive programming platform:

- **25+ Curated Problems** — Categorized across Easy, Medium, and Hard difficulties with topics like Arrays, Strings, Linked Lists, Trees, Dynamic Programming, Graphs, and more.
- **Monaco Code Editor** — Full-featured VS Code-grade editor with syntax highlighting, auto-completion, and support for **C++, Java, Python, and JavaScript**.
- **Judge0 Remote Execution** — Code is compiled and executed server-side via the Judge0 CE API with proper test case validation, time limits, and memory limits.
- **Driver Code Wrapping** — Automatic boilerplate wrapping for each language so students write only the solution function (handles I/O parsing, type conversion, and output formatting).
- **Run vs Submit** — Run against visible sample test cases or Submit against all hidden test cases with full verdict (Accepted, Wrong Answer, TLE, Runtime Error, etc.).
- **AI Code Review** — Get AI-powered analysis of your code including time/space complexity, code quality score (1–10), optimization suggestions, and alternative approaches.
- **AI Hints (3 Levels)** — Progressive hint system: Level 1 (general direction), Level 2 (specific algorithm/data structure), Level 3 (detailed pseudocode outline).
- **AI Debugger** — Paste your buggy code and get AI-powered debugging analysis with fix suggestions.
- **Gamification & XP System** — Earn XP for solving problems (Easy: 50 XP, Medium: 100 XP, Hard: 200 XP), level up, and unlock badges.
- **15+ Achievement Badges** — Including First Blood, Centurion, Speed Demon, Polyglot, Week Warrior, Bug Hunter, and more.
- **Submission Heatmap** — GitHub-style contribution heatmap tracking daily coding activity.
- **Streak Counter** — Track current and maximum coding streaks with daily activity tracking.
- **Language Usage Chart** — Visual breakdown of which programming languages you've used.
- **Difficulty Distribution** — Donut chart showing Easy/Medium/Hard solve ratio.
- **Recent Submissions History** — Scrollable list of past submissions with verdict, runtime, and memory usage.

### 🏆 Contests System

- **Create & Join Contests** — Time-bound competitive contests with selected problem sets.
- **Live Leaderboard** — Real-time ranking of participants by score, solve time, and accuracy.
- **Contest Detail Pages** — Full contest view with problem navigation, timer, and live standings.

### 🎯 Mock Interview Prep (`/coding/interview`)

- **AI Interview Question Generator** — Generate topic-specific interview questions across 6 domains: DSA, OOP, DBMS, Operating Systems, Computer Networks, and HR.
- **AI Mock Interviewer** — Conversational mock interview mode where the AI acts as an interviewer, asks follow-ups, and evaluates your responses in real-time.
- **Expandable Q&A Cards** — Click to reveal model answers for each generated question.

### 👥 Live Collaboration (`/coding/room/:roomId`)

- **Live Coding Rooms** — Real-time collaborative coding sessions with shared Monaco editor.
- **Participant Awareness** — See who else is in the room in real-time.

### 📹 Video Meetings (`/meeting/:roomId`)

Real-time video conferencing for study groups and collaborative learning:

- **LiveKit-Powered WebRTC** — High-quality, low-latency video and audio using LiveKit's infrastructure.
- **Pre-Join Screen** — Preview camera/mic settings and enter display name before joining.
- **Meeting Controls** — Toggle camera, microphone, and screen sharing.
- **Chat Panel** — In-meeting text chat for sharing links and notes during the session.
- **Participants Panel** — See all active participants with their connection status.
- **Room Creation** — Generate short-code room IDs that can be shared with classmates.

### 📁 Secure File Management (Dashboard)

- **AWS S3 Upload** — Upload study materials (PDFs, images, documents) to secure S3 storage.
- **Subject-Based Organization** — Organize files by subject with customizable folders (AI, ML, Cloud Computing, and custom subjects).
- **Auto-Expiring Share Links** — Generate time-limited S3 presigned URLs for secure sharing.
- **Inline PDF Viewer** — Built-in PDF.js powered viewer with page navigation and zoom controls.
- **PDF Text Extraction** — Extract text from uploaded PDFs for AI-powered summarization and quiz generation.

### 📝 AI Quiz Generation

- **Auto-Generated Quizzes** — Generate multiple-choice quizzes from any uploaded PDF or study material using AI.
- **Interactive Quiz Modal** — Answer questions one-by-one with instant feedback (correct/wrong highlighting).
- **Score Tracking** — Quiz scores are saved locally with subject and file metadata for analytics.
- **Wrong Topic Identification** — Track which topics need more revision based on quiz performance.

### 📊 Analytics Hub (Dashboard)

- **Study Streak Tracker** — Daily login streak with longest streak record.
- **Weekly Activity Chart** — Bar chart showing study minutes per day for the last 7 days.
- **Session Analytics** — Total study time, average session duration, and session count.
- **Quiz Performance** — Average quiz scores, total quizzes taken, and performance trends.
- **AI-Powered Revision Plans** — Personalized recommendations for topics to revise based on quiz weak areas.
- **Subject-Level Insights** — Per-subject metrics on study time and quiz performance.

### ⏱️ Productivity Dashboard

- **Pomodoro Timer** — Built-in 25/5 minute focus/break timer with audio notifications and session counter.
- **Deep Work Tracker** — Cumulative deep work hours tracked across sessions.
- **Task Management** — Create, complete, and track to-do items for study planning.
- **Progress Indicators** — Visual progress bars and completion percentages.

### 🎨 UI/UX Features

- **Dark/Light Theme Toggle** — Full theme support with smooth transitions.
- **Glassmorphism Design** — Modern frosted-glass UI elements with backdrop blur effects.
- **Responsive Layout** — Fully responsive across desktop, tablet, and mobile viewports.
- **Micro-Animations** — Smooth transitions, hover effects, and loading states throughout.
- **Toast Notifications** — Non-intrusive success/error/info notification system.
- **Error Boundaries** — Graceful error handling with fallback UI to prevent crashes.

### 🔒 Authentication & Security

- **AWS Cognito** — Secure user registration with email, password, and username.
- **OTP Email Verification** — Account verification via one-time password sent to email.
- **Protected Routes** — Route-level guards ensuring only authenticated users access the dashboard.
- **Session Management** — Secure token-based sessions managed by AWS Amplify.

---

## 🛠️ Complete Tech Stack & Tools Used

### Frontend (Client-Side)

| Tool | Purpose |
|------|---------|
| [React 19](https://react.dev/) | UI library for building component-based interfaces |
| [Vite 8](https://vitejs.dev/) | Next-generation frontend tooling for lightning-fast builds & HMR |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first CSS framework for rapid styling & responsive design |
| [React Router DOM 7](https://reactrouter.com/) | Client-side SPA routing with nested layouts & protected routes |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | VS Code-grade code editor (via `@monaco-editor/react`) |
| [LiveKit Components React](https://docs.livekit.io/) | Pre-built React components for video/audio conferencing |
| [AWS Amplify v6](https://docs.amplify.aws/) | AWS authentication (Cognito) and storage (S3) integration |
| [AWS Amplify UI React](https://ui.docs.amplify.aws/) | Pre-built UI components for auth flows |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Client-side PDF rendering, viewing, and text extraction |
| [Lucide React](https://lucide.dev/) | Modern, consistent icon library |
| [Axios](https://axios-http.com/) | Promise-based HTTP client for API requests |

### Backend (Server-Side)

| Tool | Purpose |
|------|---------|
| [Node.js](https://nodejs.org/) | JavaScript runtime environment |
| [Express.js 4](https://expressjs.com/) | Minimalist web framework for RESTful APIs |
| [AWS SDK v3 — DynamoDB](https://docs.aws.amazon.com/sdk-for-javascript/v3/) | NoSQL database client for chat history, gamification, contests, and AI memory |
| [LiveKit Server SDK](https://docs.livekit.io/) | Token generation and room management for video meetings |
| [Axios](https://axios-http.com/) | HTTP client for Groq and Judge0 API calls |
| [CORS](https://www.npmjs.com/package/cors) | Cross-Origin Resource Sharing middleware |
| [Dotenv](https://www.npmjs.com/package/dotenv) | Environment variable management |

### Cloud Services & External APIs

| Service | Purpose |
|---------|---------|
| [AWS Cognito](https://aws.amazon.com/cognito/) | User authentication, registration, and session management |
| [AWS S3](https://aws.amazon.com/s3/) | Secure, scalable object storage for uploaded study materials |
| [AWS DynamoDB](https://aws.amazon.com/dynamodb/) | NoSQL database for chat history, AI memory, gamification profiles, submissions, and contests |
| [Groq API](https://groq.com/) | Ultra-fast LLM inference (Llama 3.3 70B) powering the AI assistant, code review, hints, debugging, quiz generation, and interview prep |
| [Judge0 CE](https://judge0.com/) | Remote code compilation & execution engine for the coding arena (C++, Java, Python, JavaScript) |
| [LiveKit Cloud](https://livekit.io/) | Real-time WebRTC infrastructure for video/audio meetings |

### Development & Build Tools

| Tool | Purpose |
|------|---------|
| [ESLint 9](https://eslint.org/) | Code linting with React Hooks & Refresh plugins |
| [PostCSS](https://postcss.org/) | CSS processing and transformations |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | Automatic vendor prefix insertion for cross-browser compatibility |
| [Concurrently](https://www.npmjs.com/package/concurrently) | Run frontend & backend dev servers simultaneously |

---

## 🏗️ Project Architecture

```
studymate/
├── .env                          # Unified environment variables
├── package.json                  # Workspace root (concurrently)
│
├── studymate/                    # ── Frontend (React + Vite) ──
│   ├── src/
│   │   ├── App.jsx               # Root routes & layout
│   │   ├── main.jsx              # Entry point with Amplify config
│   │   ├── index.css             # Global styles & Tailwind directives
│   │   │
│   │   ├── aws/                  # AWS Amplify configuration
│   │   │   └── config.js
│   │   │
│   │   ├── pages/                # Page-level route components
│   │   │   ├── Landing.jsx       # Public landing page
│   │   │   ├── Login.jsx         # Login form
│   │   │   ├── Signup.jsx        # Registration form
│   │   │   ├── VerifyOTP.jsx     # OTP verification
│   │   │   ├── Dashboard.jsx     # Main student dashboard
│   │   │   ├── Meeting.jsx       # Video meeting page
│   │   │   ├── ai/
│   │   │   │   ├── StudyMateAI.jsx   # AI hub layout
│   │   │   │   └── AIChatPage.jsx    # Chat interface
│   │   │   └── coding/
│   │   │       ├── CodingArena.jsx     # Arena layout shell
│   │   │       ├── CodingDashboard.jsx # Stats & heatmap
│   │   │       ├── ProblemsPage.jsx    # Problem list
│   │   │       ├── ProblemDetail.jsx   # Editor + problem view
│   │   │       ├── ContestsPage.jsx    # Contest list
│   │   │       ├── ContestDetail.jsx   # Live contest view
│   │   │       └── InterviewPage.jsx   # Mock interview prep
│   │   │
│   │   ├── components/           # Reusable UI components
│   │   │   ├── AnalyticsDashboard.jsx
│   │   │   ├── ProductivityDashboard.jsx
│   │   │   ├── PDFViewer.jsx
│   │   │   ├── FileList.jsx
│   │   │   ├── UploadButton.jsx
│   │   │   ├── QuizModal.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── ai/
│   │   │   │   ├── AISidebar.jsx       # Chat list sidebar
│   │   │   │   ├── AIMemoryPanel.jsx   # Memory management
│   │   │   │   ├── PDFChatPanel.jsx    # PDF upload for AI
│   │   │   │   └── PromptLibrary.jsx   # Prompt templates
│   │   │   ├── coding/
│   │   │   │   ├── CodeEditor.jsx      # Monaco editor wrapper
│   │   │   │   ├── OutputPanel.jsx     # Run/submit results
│   │   │   │   ├── AIReviewPanel.jsx   # Code review display
│   │   │   │   ├── AIHintPanel.jsx     # Progressive hints
│   │   │   │   ├── AIDebugPanel.jsx    # Debugger panel
│   │   │   │   ├── GamificationPanel.jsx
│   │   │   │   ├── SubmissionHeatmap.jsx
│   │   │   │   ├── StreakCounter.jsx
│   │   │   │   ├── DifficultyChart.jsx
│   │   │   │   ├── LanguageChart.jsx
│   │   │   │   ├── StatsOverview.jsx
│   │   │   │   ├── BadgeCard.jsx
│   │   │   │   ├── Leaderboard.jsx
│   │   │   │   ├── ContestCard.jsx
│   │   │   │   ├── LiveCodingRoom.jsx
│   │   │   │   ├── ProblemCard.jsx
│   │   │   │   ├── ProblemDescription.jsx
│   │   │   │   ├── SubmissionHistory.jsx
│   │   │   │   └── CodingSidebar.jsx
│   │   │   └── meeting/
│   │   │       ├── MeetingModal.jsx
│   │   │       ├── MeetingRoom.jsx
│   │   │       ├── PreJoin.jsx
│   │   │       ├── Controls.jsx
│   │   │       ├── ChatPanel.jsx
│   │   │       ├── ParticipantsPanel.jsx
│   │   │       └── VideoTile.jsx
│   │   │
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useStudyTracker.js    # Streak, sessions, quiz scores
│   │   │   ├── useCloudSync.js       # DynamoDB cloud sync
│   │   │   ├── useRecommendations.js # AI study recommendations
│   │   │   ├── usePersonalization.js # User preferences
│   │   │   ├── useNotes.js           # Notes management
│   │   │   ├── useChatManager.js     # Chat state management
│   │   │   └── useTheme.js           # Dark/light theme
│   │   │
│   │   ├── services/             # API service layers
│   │   │   ├── ai/
│   │   │   │   └── chatApi.js        # AI chat API calls
│   │   │   └── coding/
│   │   │       ├── codingApi.js      # Coding arena API calls
│   │   │       └── problems.js       # Problem constants
│   │   │
│   │   └── utils/                # Utility functions
│   │       └── pdfTextExtractor.js   # PDF.js text extraction
│   │
│   └── package.json
│
└── backend/                      # ── Backend (Node.js + Express) ──
    ├── server.js                 # Express app entry point
    ├── config/
    │   └── dynamoDb.js           # DynamoDB client config
    ├── routes/
    │   ├── aiRoutes.js           # AI chat & quiz endpoints
    │   ├── chatRoutes.js         # Chat CRUD operations
    │   ├── codingRoutes.js       # Coding arena endpoints
    │   ├── meetingRoutes.js      # LiveKit token & room mgmt
    │   ├── memoryRoutes.js       # AI memory CRUD
    │   └── userRoutes.js         # User profile endpoints
    ├── controllers/
    │   ├── aiController.js       # AI chat, quiz gen, summarize
    │   ├── chatController.js     # Chat persistence & Groq calls
    │   ├── codingController.js   # Problem solving & submission
    │   ├── contestController.js  # Contest CRUD & leaderboard
    │   ├── meetingController.js  # LiveKit room/token generation
    │   ├── memoryController.js   # AI memory management
    │   └── dbController.js       # Database utilities
    ├── services/
    │   ├── judge0Service.js      # Judge0 API integration
    │   ├── aiCodeService.js      # AI code generation
    │   ├── aiReviewService.js    # AI code review, hints, debug
    │   ├── codeWrapper.js        # Language-specific driver code
    │   ├── gamificationService.js # XP, badges, streaks, levels
    │   └── problemsData.js       # Problem bank (25+ problems)
    └── package.json
```

---

## 🔌 API Endpoints

### AI & Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/chat` | Send a message to Groq AI |
| `POST` | `/api/ai/quiz` | Generate quiz from text |
| `POST` | `/api/ai/summarize` | Summarize document text |
| `GET` | `/api/chat/:userId` | List all chats for a user |
| `POST` | `/api/chat/:userId` | Send message & get AI reply |
| `PUT` | `/api/chat/:userId/:chatId` | Rename a chat |
| `DELETE` | `/api/chat/:userId/:chatId` | Delete a chat |

### Coding Arena
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/coding/problems` | List problems (with filters) |
| `GET` | `/api/coding/problems/:id` | Get problem details |
| `POST` | `/api/coding/run` | Run code against sample tests |
| `POST` | `/api/coding/submit` | Submit code against all tests |
| `POST` | `/api/coding/review` | AI code review |
| `POST` | `/api/coding/hint` | Get progressive AI hints |
| `POST` | `/api/coding/debug` | AI debugging analysis |
| `POST` | `/api/coding/interview/questions` | Generate interview questions |
| `POST` | `/api/coding/interview/mock` | AI mock interview conversation |
| `GET` | `/api/coding/dashboard/:userId` | Get coding stats & profile |

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/meeting/token` | Generate LiveKit access token |
| `POST` | `/api/meeting/create-room` | Create a new meeting room |

### AI Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/memory/:userId` | Get all memory items |
| `POST` | `/api/memory/:userId` | Add/update a memory item |
| `DELETE` | `/api/memory/:userId/:key` | Delete a memory item |
| `DELETE` | `/api/memory/:userId?all=true` | Clear all memory |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **Git**
- An **AWS Account** with Cognito, S3, and DynamoDB configured
- A free **Groq API Key** from [console.groq.com](https://console.groq.com)
- (Optional) A **Judge0 API Key** from [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) for code execution
- (Optional) A **LiveKit Cloud** account from [livekit.io](https://livekit.io) for video meetings

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/studymate-ai.git
cd studymate-ai
```

### 2. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# ── AWS Cognito (Authentication) ──
VITE_USER_POOL_ID=your_cognito_user_pool_id
VITE_USER_POOL_CLIENT_ID=your_cognito_app_client_id
VITE_IDENTITY_POOL_ID=your_cognito_identity_pool_id

# ── AWS S3 (File Storage) ──
VITE_S3_BUCKET=your_s3_bucket_name
VITE_S3_REGION=your_s3_region

# ── AWS General ──
AWS_REGION=your_aws_region

# ── Groq AI (Required for AI Features) ──
VITE_GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY=your_groq_api_key

# ── LiveKit (Video Meetings) ──
VITE_LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# ── Judge0 (Code Execution) ──
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_judge0_rapidapi_key

# ── Server ──
PORT=5000
```

### 3. Install Dependencies

```bash
# Install all dependencies (root, frontend, and backend)
npm run install:all
```

Or install individually:

```bash
# Root workspace
npm install

# Frontend
cd studymate && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

### 4. AWS DynamoDB Tables

Create the following DynamoDB tables in your AWS account:

| Table Name | Partition Key | Sort Key |
|------------|--------------|----------|
| `studymate_chats` | `userId` (String) | `chatId` (String) |
| `studymate_messages` | `chatId` (String) | `messageId` (String) |
| `studymate_ai_memory` | `userId` (String) | `memoryKey` (String) |
| `studymate_gamification` | `userId` (String) | — |
| `studymate_submissions` | `oderId` (String) | `submissionId` (String) |
| `studymate_contests` | `contestId` (String) | — |

### 5. Start the Application

```bash
# Run both frontend and backend concurrently
npm run dev
```

Or run individually:

```bash
# Frontend only (http://localhost:5173)
npm run dev:frontend

# Backend only (http://localhost:5000)
npm run dev:backend
```

### 6. Access the App

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000` |
| Health Check | `http://localhost:5000/api/health` |

---

## 📱 Application Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page |
| `/signup` | Public | User registration |
| `/verify` | Public | OTP verification |
| `/login` | Public | Login |
| `/dashboard` | Protected | Main student dashboard |
| `/ai` | Protected | AI Assistant hub |
| `/ai/chat/:chatId` | Protected | Specific AI chat |
| `/coding` | Protected | Coding Arena dashboard |
| `/coding/problems` | Protected | Problem list |
| `/coding/problem/:id` | Protected | Problem solving |
| `/coding/contests` | Protected | Contests list |
| `/coding/contest/:id` | Protected | Contest detail |
| `/coding/interview` | Protected | Mock interview prep |
| `/coding/room/:roomId` | Protected | Live coding room |
| `/meeting/:roomId` | Protected | Video meeting room |

---

## 🧩 Key Design Decisions

- **Monorepo with Concurrently** — Single `npm run dev` command starts both frontend and backend, with a unified `.env` at the root.
- **VITE_ Prefix Convention** — Environment variables prefixed with `VITE_` are exposed to the frontend via Vite's env system; others remain server-only.
- **Driver Code Wrapping** — The coding arena auto-wraps user solutions in language-specific driver code, so students write only the core function — no boilerplate needed.
- **Progressive AI Hints** — Three hint levels prevent students from jumping straight to solutions, encouraging incremental learning.
- **Local + Cloud Hybrid** — Study analytics (streaks, sessions, quiz scores) are stored in `localStorage` for instant access, with cloud sync to DynamoDB for persistence.
- **Offline-Safe AI** — If no `GROQ_API_KEY` is configured, the app gracefully falls back to mock responses instead of crashing.

---

## 📄 License

This project is for educational purposes.

---

<p align="center">
  Built with ❤️ for students, by students.
</p>
