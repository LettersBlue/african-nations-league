# African Nations League Tournament Platform

A comprehensive tournament simulation platform for the African Nations League built with Next.js 16, Firebase, and AI-powered match commentary.

**INF4001N Entrance Exam 2026 Submission**

## 📦 Submission Package

- **Source Code Archive**: `INF4001N_QVLAMA001_ANLeague_2026.zip` (included in the project root, follows `INF4001N_StudentNO_ANLeague_2026` naming convention). Unzip to a working folder before following the local setup steps.
- **Database Access**: Viewer access granted in Firebase to `ammarcanani@gmail.com` and `elsje.scott@uct.ac.za`. They can sign in with their existing Google accounts—no additional passwords required.
- **Live Deployment URL**: [https://african-nations-league-theta.vercel.app](https://african-nations-league-theta.vercel.app)
- **Administrator Credentials**: `admin@r2g.com / 123456`

## 🚀 Getting Started Quickly

- **Use the Hosted App**  
  Visit the production deployment at [https://african-nations-league-theta.vercel.app](https://african-nations-league-theta.vercel.app). No installation needed.

- **Run Locally from the Provided Zip**  
  Follow the steps in the next section after extracting `INF4001N_QVLAMA001_ANLeague_2026.zip` on your machine (e.g., `~/Projects/african-nations-league`).

### Login Credentials

**Administrator Account:**
- **Email**: `admin@r2g.com`
- **Password**: `123456`

**Representative Accounts:**
- Register your own account at `/register` and select "Representative" role

## 📖 How to Run the Application

This section explains how to run the application locally on your machine. **Note: End users accessing the deployed URL do not need to follow these steps** - environment variables are already configured on the deployment platform (Vercel).

### Prerequisites
- **Node.js** 18.0 or higher
- **npm** package manager
- **Firebase** project (with Firestore and Authentication enabled)
- **Groq API** account ([console.groq.com](https://console.groq.com))
- **Resend** account ([resend.com](https://resend.com))

### Steps to Run Locally

1. **Extract the source archive**
   ```bash
   unzip INF4001N_QVLAMA001_ANLeague_2026.zip -d african-nations-league
   cd african-nations-league
   ```
   > Already working inside this repository? Skip the unzip step and continue.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` file** in the root directory with the following variables:
   ```env
   # Firebase Client Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin SDK (Service Account JSON as string)
   FIREBASE_ADMIN_SDK_KEY={"type":"service_account",...}

   # Groq AI API
   GROQ_API_KEY=your_groq_api_key

   # Gmail SMTP (for invitation emails - optional)
   # Only needed if you want to send invitation emails to representatives/admins
   # GMAIL_USER=your-email@gmail.com
   # GMAIL_APP_PASSWORD=your-app-password

   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication (Email/Password)
   - Generate service account key and add to `FIREBASE_ADMIN_SDK_KEY`
   - Deploy security rules: `firestore.rules`
   - Deploy indexes: `firestore.indexes.json`

5. **Set up API keys**
   - Get Groq API key from [console.groq.com](https://console.groq.com) (free tier available for testing)
     - Free tier: Limited requests per minute (check console for limits)
     - Model used: `llama-3.1-8b` (free tier friendly) or set `GROQ_MODEL=llama-3.1-70b-versatile` for paid tier
   - (Optional) Set up Gmail SMTP for invitation emails:
     - Enable 2-Factor Authentication on your Gmail account
     - Generate an App Password at https://myaccount.google.com/apppasswords
     - Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to `.env.local`

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧠 System Rationale & Architecture

The African Nations League platform streamlines tournament management by combining automated team registration, AI-driven match commentary, and rich analytics into a single experience. The design goal is to offer administrators quick control over fixtures while enabling representatives and the public to engage with accurate, data-backed tournament updates in real time.

### Core Components
- **Next.js App Router UI**: Handles public pages, representative dashboard, and administrative console.
- **Firebase Authentication**: Manages secure, role-based sign-in for administrators and representatives.
- **Firestore Database**: Stores teams, players, match fixtures, commentary logs, and tournament metadata.
- **Server Actions & API Routes**: Execute secure operations such as match simulation, team management, and tournament resets.
- **Groq AI Commentary Service**: Primary provider for real-time play-by-play narratives.
- **Cohere AI Backup Service**: Fallback provider ensuring commentary resilience when Groq is unavailable.
- **Browser Text-to-Speech**: Uses the Web Speech API to turn commentary into audio for immersive match playback.
- **Email Notifications**: Gmail SMTP integration delivers onboarding, invitations, and match summaries to stakeholders.

### System Architecture Diagram

```
                           ┌───────────────────────────────┐
                           │         Web Browser           │
                           │   (Next.js App Router UI)     │
                           └──────────────┬────────────────┘
                                          │  HTTPS
                                          ▼
              ┌────────────────────────────────────────────────┐
              │                 Vercel Hosting                 │
              │  - Server Components & Route Handlers          │
              │  - Server Actions & Edge Functions             │
              └──────────────┬──────────────┬──────────────────┘
                             │              │
                 Firestore SDK│              │ External APIs
                             │              │
                             ▼              ▼
              ┌────────────────────────┐   ┌────────────────────┐
              │   Firebase Firestore   │   │   Groq AI Service   │
              │ - Teams, Matches, Logs │   │ - Primary Commentary│
              └───────────┬────────────┘   └───────────▲────────┘
                          │ Admin SDK                  │
                          ▼                            │
              ┌────────────────────────┐              │
              │     Firebase Auth      │              │
              │ - Role-Based Access    │              │
              │ - Credential Storage   │              │
              └───────────┬────────────┘              │
                          │ SMTP Relay                │
                          ▼                           │
              ┌────────────────────────┐              │
              │   Gmail SMTP Service   │              │
              │ - Invitations          │              │
              │ - Notifications        │              │
              └────────────────────────┘              │
                                                      │
              ┌────────────────────────┐◄─────────────┘
              │   Cohere AI Service    │
              │ - Commentary Backup    │
              └────────────────────────┘
                                          ▲
                                          │ Commentary Stream
                           ┌──────────────┴────────────────┐
                           │   Browser Text-to-Speech      │
                           │   - Match Audio Playback      │
                           └───────────────────────────────┘
```

## 👥 User Roles

### Administrator
- Start tournaments (when 8 teams registered)
- Play matches with AI commentary
- Simulate matches instantly
- Reset tournaments
- View all matches and tournament status

### Representative
- Register country's team
- Add 23 players with positions (GK, DF, MD, AT)
- Designate team captain
- View team analytics
- Receive email notifications after matches

### Visitor (Public Access)
- View tournament bracket
- View match results and commentary
- View top scorers leaderboard
- Browse tournament history
- No login required

## ⚽ Key Features

### Team Registration
- Representatives select their country from 55 African countries (must be unique)
- Add exactly 23 players with positions: GK (Goalkeeper), DF (Defender), MD (Midfielder), AT (Attacker)
- Designate one player as team captain
- Auto-generate player ratings (50-100 for natural position, 0-50 for others)
- Calculate team overall rating (average of all 92 position ratings)

### Tournament Structure
- 8-team knockout tournament starting at Quarter Finals
- Three rounds: Quarter Finals → Semi Finals → Final
- Visual bracket display with "Road to Final" visualization
- Real-time bracket updates after each match

### Match Simulation
Two types of match simulation available:
1. **Simple Simulation**: Instant results based on team ratings
2. **AI Commentary**: Full play-by-play text commentary using Groq API (Llama 3.1)


### Public Pages
- Tournament bracket (no login required)
- Match details with AI commentary
- Top scorers leaderboard
- Tournament history

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router, React Server Components)
- **Backend**: Next.js Server Actions + API Routes
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **AI Service**: Groq API with Llama 3.1 (for match commentary)
- **Email**: Gmail SMTP via Nodemailer (for invitations and notifications)
- **Styling**: Tailwind CSS with custom glass morphism effects
- **Charts**: Recharts (for analytics dashboard)
- **Tournament Bracket**: React Tournament Brackets library
- **Deployment**: Vercel (serverless deployment)

## 🚀 Deployment (For Developers)

The application is deployed on **Vercel**. When deployed, all environment variables are configured on Vercel, so **end users accessing the deployed URL do not need any setup** - they simply visit the URL and start using the application.

### Deploying to Vercel

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import the GitHub repository (or upload the unzipped folder to a new repo first if starting from the provided archive)

2. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables, add all variables:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
     - `FIREBASE_ADMIN_SDK_KEY` (paste entire JSON as string)
     - `GROQ_API_KEY`
     - `NEXT_PUBLIC_APP_URL` (set after first deployment with your deployment URL)
     - (Optional) `GMAIL_USER` and `GMAIL_APP_PASSWORD` if you want invitation emails

3. **Deploy**
   - Vercel will automatically detect Next.js and configure build settings
   - Click "Deploy" to start the first deployment
   - Vercel will automatically deploy on future pushes to `main` branch

4. **After Deployment**
   - Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables with your deployment URL
   - Test the deployment by visiting the URL

## 📧 Contact & Support

For questions regarding this submission:
- **Live Deployment**: [https://african-nations-league-theta.vercel.app](https://african-nations-league-theta.vercel.app)
- **Admin Login**: admin@r2g.com / 123456

---

**African Nations League Tournament Platform** 

Built for INF4001N Entrance Exam 2026 | University of Cape Town

Made with ❤️ by Amahle Quvile
