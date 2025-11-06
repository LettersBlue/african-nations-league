# African Nations League Tournament Platform

A comprehensive tournament simulation platform for the African Nations League built with Next.js 16, Firebase, and AI-powered match commentary.

**INF4001N Entrance Exam 2026 Submission**

## 🚀 Deployment

**Deployed URL**: _To be deployed - URL will be updated after deployment_

## 📋 Submission Information

### Administrator Credentials
- **Email**: `admin@african-nations-league.com`
- **Password**: `admin123`

### Database Access
Firebase Firestore database access has been granted to:
- `ammarcanani@gmail.com`
- `elsje.scott@uct.ac.za`

These accounts have been added as project members with Viewer access to the Firebase project.

## Features

### Core Requirements ✅
- **8-team knockout tournament** starting at Quarter Finals
- **Three user roles**: Admin, Representative, Visitor
- **Team registration** with 23 players and captain designation
- **Dual match simulation**: Simple simulation vs AI commentary
- **Email notifications** to team representatives after matches
- **Public access** to bracket, match results, and top scorers
- **Tournament reset** capability at any time

### Bonus Features ✅
- **Analytics Dashboard**: Team performance stats and charts for representatives
- **Tournament History**: Past tournaments, winners, and statistics
- **Real-life Team Data**: Auto-populate with actual African national team squads

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router, React Server Components)
- **Backend**: Next.js Server Actions + API Routes
- **Database**: Firebase Firestore (NoSQL) ✅
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **AI Service**: Groq API with Llama 3.1 (for match commentary)
- **Email**: Resend API (for match result notifications)
- **Styling**: Tailwind CSS with custom glass morphism effects
- **Charts**: Recharts (for analytics dashboard)
- **Tournament Bracket**: React Tournament Brackets library
- **Deployment**: Vercel (serverless deployment)

## 📖 How to Run the Application

### Prerequisites
- **Node.js** 18.0 or higher
- **npm** or **yarn** package manager
- **Firebase** project (with Firestore and Authentication enabled)
- **Groq API** account (free tier available at [console.groq.com](https://console.groq.com))
- **Resend** account (free tier available at [resend.com](https://resend.com))

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/LettersBlue/african-nations-league.git
   cd african-nations-league
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory with the following variables:
   
   ```env
   # Firebase Client Configuration (Public)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin SDK (Server-side only - Keep secret!)
   FIREBASE_ADMIN_SDK_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

   # Groq AI API (for match commentary)
   GROQ_API_KEY=your_groq_api_key

   # Resend Email API (for match notifications)
   RESEND_API_KEY=re_your_resend_api_key

   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Firebase Project**
   
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (or use existing)
   - Enable **Firestore Database** (start in production mode)
   - Enable **Authentication** → Sign-in method → Enable Email/Password
   - Go to Project Settings → Service Accounts → Generate new private key
   - Copy the entire JSON content and paste it as `FIREBASE_ADMIN_SDK_KEY` in `.env.local`
   - Deploy Firestore security rules from `firestore.rules`
   - Deploy Firestore indexes from `firestore.indexes.json`
   - Add `ammarcanani@gmail.com` and `elsje.scott@uct.ac.za` as project members (Viewer role)

5. **Set up Groq API**
   - Sign up at [console.groq.com](https://console.groq.com)
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key and add it as `GROQ_API_KEY` in `.env.local`

6. **Set up Resend Email Service**
   - Sign up at [resend.com](https://resend.com)
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`) and add it as `RESEND_API_KEY` in `.env.local`
   - For production, verify your domain in Resend dashboard

7. **Seed initial data (Optional)**
   ```bash
   npm run seed
   ```
   This will create sample teams and tournament data for testing.

8. **Start the development server**
   ```bash
   npm run dev
   ```

9. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

10. **Build for production**
    ```bash
    npm run build
    npm start
    ```

## 👥 User Roles & Access

### Administrator Role
Administrators can:
- Start tournaments when 8 teams are registered
- Play matches with AI commentary
- Simulate matches instantly
- Reset tournaments at any time
- View all matches and tournament status
- Manage tournament brackets

**Login Credentials:**
- **Email**: `admin@african-nations-league.com`
- **Password**: `admin123`

### Representative Role
Representatives can:
- Register their country's team
- Select manager name
- Add 23 players with positions (GK, DF, MD, AT)
- Designate team captain
- View team analytics and performance
- Receive email notifications after matches

**Demo Accounts:**
- Create your own by registering at `/register` and selecting "Representative" role

### Visitor Role (Public Access)
Visitors (logged in or not) can:
- View tournament bracket ("Road to Final")
- View match summaries and results
- See AI commentary for "played" matches
- View top scorers leaderboard
- Browse tournament history

No login required for public pages.

## Project Structure

```
african-nations-league/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   ├── (dashboard)/              # Protected dashboard pages
│   ├── (public)/                 # Public tournament pages
│   ├── api/                      # API routes
│   └── actions/                  # Server actions
├── components/                    # React components
│   ├── auth/                     # Authentication components
│   ├── tournament/               # Tournament components
│   ├── admin/                    # Admin components
│   ├── representative/            # Representative components
│   └── public/                   # Public components
├── lib/                          # Utility libraries
│   ├── firebase/                 # Firebase configuration
│   ├── ai/                       # AI service integration
│   ├── email/                    # Email service
│   └── utils/                    # Utility functions
├── types/                        # TypeScript definitions
├── data/                         # Static data files
└── scripts/                      # Build and seed scripts
```

## ⚽ Key Features Explained

### Team Registration (Representative)
- Representatives select their country from a list of 55 African countries (must be unique)
- Enter manager name
- Add exactly 23 players with positions:
  - **GK** (Goalkeeper)
  - **DF** (Defender)
  - **MD** (Midfielder)
  - **AT** (Attacker)
- Each player has a natural position
- Designate one player as team captain
- **Auto-generate player ratings**:
  - Natural position: 50-100 rating
  - Non-natural positions: 0-50 rating
- Calculate team overall rating (average of all 92 position ratings)
- **Bonus**: Import real-life African national team data automatically

### Tournament Structure
- **8-team knockout tournament** starting at Quarter Finals
- Automatic bracket generation with random team placement
- Three rounds: Quarter Finals → Semi Finals → Final
- Visual bracket display with "Road to Final" visualization
- Real-time bracket updates after each match

### Match Simulation (Admin Only)
The platform supports two types of match simulation:

1. **Simple Simulation**:
   - Instant results based on team ratings and randomness
   - Shows final scoreline, goal scorers, and minute of goals
   - No play-by-play commentary
   - Faster execution

2. **AI Commentary (Play Match)**:
   - Full play-by-play text commentary using Groq API (Llama 3.1)
   - Shows key moments: goals, saves, fouls, substitutions
   - Can go to extra time and penalty shootouts
   - Realistic match progression
   - Email notifications sent to team representatives after completion

Both methods generate:
- Final scoreline
- Goal scorers with minute of goal
- Match statistics

### Email Notifications
- Automatic emails sent to team representatives after match completion
- Email includes match results, scoreline, and goal scorers
- Uses Resend API for reliable delivery

### Tournament Management (Admin)
- Start tournament when exactly 8 teams are registered
- View all matches with status (pending, in_progress, completed)
- Reset tournament at any time (preserves history)
- Archive completed tournaments

### Public Pages (No Login Required)
- **Tournament Bracket**: Visual "Road to Final" with red rounded headers
- **Match Details**: 
  - Full AI commentary for "played" matches
  - Simple results for "simulated" matches
- **Top Scorers Leaderboard**: Ranked list of all goal scorers
- **Tournament History**: Past winners, finalists, and statistics

### Analytics Dashboard (Representative)
- Team performance statistics and charts
- Player goal contributions
- Win/loss records
- Match history
- Visual analytics using Recharts

## API Endpoints

- `POST /api/ai/commentary` - Generate AI match commentary
- `POST /api/matches/simulate` - Simulate match results
- `POST /api/email/notify` - Send match result emails

## Environment Variables

All required environment variables are documented in `env.example`. Make sure to set up:
- Firebase configuration
- Firebase Admin SDK key
- Groq API key
- Resend API key
- App URL

## 🚀 Deployment Instructions

The application can be deployed on **Vercel** for serverless hosting.

### Deployment Steps

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import the GitHub repository: `LettersBlue/african-nations-league`

2. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables, add all variables from `.env.local`:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
     - `FIREBASE_ADMIN_SDK_KEY` (paste entire JSON as string - important: keep it as a single-line string)
     - `GROQ_API_KEY`
     - `RESEND_API_KEY`
     - `NEXT_PUBLIC_APP_URL` (will be set automatically by Vercel, or set manually after first deployment)

3. **Deploy**
   - Vercel will automatically detect Next.js and configure build settings
   - Click "Deploy" to start the first deployment
   - Vercel will automatically deploy on future pushes to `main` branch

4. **After Deployment**
   - Note your deployment URL (e.g., `https://african-nations-league.vercel.app`)
   - Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables with your deployment URL
   - Verify deployment by visiting the URL
   - Test authentication
   - Verify Firebase connection
   - Test match simulation

### Alternative Deployment Options
- **Netlify**: Similar process, import from GitHub and add environment variables
- **Firebase Hosting**: Use `firebase deploy` command (requires Firebase CLI setup)
- **Self-hosted**: Run `npm run build && npm start` on your server

## 🧪 Testing the Application

### Testing Checklist

**Administrator Testing:**
- [x] Login with admin credentials
- [x] Start tournament when 8 teams registered
- [x] Simulate a match (instant results)
- [x] Play a match with AI commentary
- [x] Verify email notifications sent after matches
- [x] Reset tournament functionality
- [x] View all matches and bracket status

**Representative Testing:**
- [x] Register as representative
- [x] Select country (must be unique)
- [x] Create team with 23 players
- [x] Designate captain
- [x] Import real-life team data (bonus feature)
- [x] View team analytics dashboard
- [x] Receive email notifications

**Visitor/Public Testing:**
- [x] View tournament bracket without login
- [x] View match details (commentary for "played" matches)
- [x] View match results (for "simulated" matches)
- [x] View top scorers leaderboard
- [x] Browse tournament history

**System Testing:**
- [x] Player ratings generated correctly (50-100 for natural, 0-50 for others)
- [x] Team rating calculated correctly (average of all 92 ratings)
- [x] Bracket updates in real-time
- [x] Match results saved correctly
- [x] Email notifications working
- [x] Firebase database operations
- [x] Authentication and authorization

## 📁 Project Structure

```
african-nations-league/
├── app/                          # Next.js 16 App Router
│   ├── (auth)/                   # Authentication pages (login, register)
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── admin/                # Admin-only pages
│   │   └── representative/       # Representative pages
│   ├── (public)/                 # Public tournament pages
│   ├── api/                      # API routes
│   │   ├── ai/commentary/        # AI commentary endpoint
│   │   ├── email/notify/         # Email notification endpoint
│   │   └── matches/simulate/     # Match simulation endpoint
│   ├── actions/                  # Server actions (auth, matches, teams, etc.)
│   ├── globals.css               # Global styles with tournament header styling
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                    # React components
│   ├── auth/                     # Authentication components
│   ├── tournament/               # Tournament components (BracketView, etc.)
│   ├── admin/                    # Admin dashboard components
│   ├── representative/            # Representative dashboard components
│   ├── public/                   # Public view components
│   └── ui/                       # Reusable UI components
├── lib/                          # Utility libraries
│   ├── firebase/                 # Firebase configuration (client & admin)
│   ├── ai/                       # AI service integration (Groq)
│   ├── email/                    # Email service (Resend)
│   └── utils/                    # Utility functions (bracket, match simulator, etc.)
├── types/                        # TypeScript type definitions
├── data/                         # Static data (African teams JSON)
├── public/                       # Static assets (images, sounds)
│   ├── field.jpg                 # Background image for bracket
│   ├── Trophy.jpg                # Tournament trophy image
│   └── sounds/                   # Audio files for bonus features
├── scripts/                      # Build and seed scripts
├── firebase.json                 # Firebase configuration
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore indexes
└── package.json                  # Dependencies and scripts
```

## 🔒 Security & Authentication

- **Firebase Authentication**: Email/Password authentication
- **Role-based Access Control**: Admin, Representative, Visitor roles
- **Firestore Security Rules**: Implemented to protect data access
- **Server Actions**: Secure server-side operations
- **Environment Variables**: Sensitive data stored securely

## 🎨 UI/UX Features

- **Glass Morphism Design**: Modern glassmorphic UI components
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Tournament Bracket Visualization**: Interactive bracket with red rounded headers
- **Field Background**: Custom field.jpg background for bracket container
- **Dark Theme**: Consistent dark theme throughout
- **Real-time Updates**: Live bracket and match status updates

## 📊 Bonus Features Implemented

1. ✅ **Analytics Dashboard**: Team performance statistics with charts
2. ✅ **Tournament History**: Past tournaments, winners, and finalists
3. ✅ **Real-life Team Data**: Auto-populate with actual African national team squads
4. ✅ **Audio Effects**: Sound effects for goals and match events (in public/sounds/)
5. ✅ **Enhanced Match Information**: Detailed match statistics and player performance

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Errors:**
- Verify all Firebase environment variables are set correctly
- Check that Firestore is enabled in Firebase Console
- Ensure Firebase Admin SDK key is valid JSON

**AI Commentary Not Working:**
- Verify GROQ_API_KEY is set correctly
- Check Groq API quota/limits
- System has fallback to simple simulation if AI fails

**Email Notifications Not Sending:**
- Verify RESEND_API_KEY is correct
- Check Resend domain verification status
- Check email addresses are valid

**Build Errors:**
- Ensure Node.js 18+ is installed
- Run `npm install` to ensure all dependencies are installed
- Check that all environment variables are set

## 📝 Notes

- The application uses Firebase Firestore as the NoSQL database
- All database access has been granted to examiners as specified
- The admin account is pre-configured for testing
- Tournament can be reset at any time without losing history
- Player ratings are randomly generated according to exam specifications

## 📧 Contact & Support

For questions regarding this submission:
- **Repository**: https://github.com/LettersBlue/african-nations-league
- **Live Deployment**: _To be deployed - URL will be provided after deployment_
- **Admin Login**: admin@african-nations-league.com / admin123

---

**African Nations League Tournament Platform** 

Built for INF4001N Entrance Exam 2026 | University of Cape Town

Built with ❤️ for African football

