# African Nations League Tournament Platform

A comprehensive tournament simulation platform for the African Nations League built with Next.js 16, Firebase, and AI-powered match commentary.

**INF4001N Entrance Exam 2026 Submission**

## 🚀 Using the Deployed Application

**Deployed URL**: _To be deployed - URL will be updated after deployment_

Once deployed, you can access the application at the URL above. **No setup required** - simply visit the URL in your web browser and start using the platform.

### Login Credentials

**Administrator Account:**
- **Email**: `admin@r2g.com`
- **Password**: `123456`

**Representative Accounts:**
- Register your own account at `/register` and select "Representative" role

### Database Access

Firebase Firestore database access has been granted to:
- `ammarcanani@gmail.com`
- `elsje.scott@uct.ac.za`

These accounts have been added as project members with Viewer access to the Firebase project.

## 📖 How to Run the Application

This section explains how to run the application locally on your machine. **Note: End users accessing the deployed URL do not need to follow these steps** - environment variables are already configured on the deployment platform (Vercel).

### Prerequisites
- **Node.js** 18.0 or higher
- **npm** package manager
- **Firebase** project (with Firestore and Authentication enabled)
- **Groq API** account ([console.groq.com](https://console.groq.com))
- **Resend** account ([resend.com](https://resend.com))

### Steps to Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/LettersBlue/african-nations-league.git
   cd african-nations-league
   ```

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

   # Resend Email API
   RESEND_API_KEY=re_your_resend_api_key

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
   - Get Resend API key from [resend.com](https://resend.com)

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

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

### Email Notifications
- Automatic emails sent to team representatives after match completion
- Email includes match results, scoreline, and goal scorers

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
- **Email**: Resend API (for match result notifications)
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
   - Import the GitHub repository: `LettersBlue/african-nations-league`

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
     - `RESEND_API_KEY`
     - `NEXT_PUBLIC_APP_URL` (set after first deployment with your deployment URL)

3. **Deploy**
   - Vercel will automatically detect Next.js and configure build settings
   - Click "Deploy" to start the first deployment
   - Vercel will automatically deploy on future pushes to `main` branch

4. **After Deployment**
   - Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables with your deployment URL
   - Test the deployment by visiting the URL

## 📧 Contact & Support

For questions regarding this submission:
- **Live Deployment**: _To be deployed - URL will be provided after deployment_
- **Admin Login**: admin@r2g.com / 123456

---

**African Nations League Tournament Platform** 

Built for INF4001N Entrance Exam 2026 | University of Cape Town

Made with ❤️ by Amahle Quvile
