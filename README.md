# African Nations League Tournament Platform

A comprehensive tournament simulation platform for the African Nations League built with Next.js 15, Firebase, and AI-powered match commentary.

## Live Demo

🚀 **Live URL**: [https://african-nations-league.vercel.app](https://african-nations-league.vercel.app)

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

## Tech Stack

- **Frontend**: Next.js 15 (App Router, React Server Components)
- **Backend**: Next.js Server Actions + API Routes
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **AI Service**: Groq API with Llama 3.1 (free tier)
- **Email**: Resend (free tier)
- **Styling**: Tailwind CSS
- **Charts**: Recharts (for analytics)
- **Deployment**: Vercel

## Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase project
- Groq API account
- Resend account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd african-nations-league
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin SDK
   FIREBASE_ADMIN_SDK_KEY={"type":"service_account",...}

   # AI Service
   GROQ_API_KEY=your_groq_api_key

   # Email Service
   RESEND_API_KEY=re_your_resend_key

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Firebase**
   - Create a Firebase project
   - Enable Firestore Database
   - Enable Authentication (Email/Password + Google)
   - Download service account key
   - Configure Firestore security rules

5. **Set up Groq**
   - Sign up at [console.groq.com](https://console.groq.com)
   - Get your free API key
   - Add to environment variables

6. **Set up Resend**
   - Sign up at [resend.com](https://resend.com)
   - Verify your domain (or use test domain)
   - Get your API key

7. **Seed initial data**
   ```bash
   npm run seed
   ```

8. **Start development server**
   ```bash
   npm run dev
   ```

9. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Credentials

### Admin Account
- **Email**: admin@african-nations-league.com
- **Password**: admin123

### Representative Accounts
- **Nigeria**: rep1@example.com / password123
- **Egypt**: rep2@example.com / password123
- **Senegal**: rep3@example.com / password123
- **Morocco**: rep4@example.com / password123
- **Ivory Coast**: rep5@example.com / password123
- **Ghana**: rep6@example.com / password123
- **Cameroon**: rep7@example.com / password123

## Database Access

Firebase project access has been granted to:
- ammarcanani@gmail.com
- elsje.scott@uct.ac.za

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

## Key Features Explained

### Team Registration
- Representatives select their country (must be unique)
- Enter manager name
- Add 23 players with positions (GK, DF, MD, AT)
- Designate one captain
- Auto-generate player ratings (50-100 for natural position, 0-50 for others)
- Calculate team overall rating (average of all 92 ratings)

### Match Simulation
Two types of match simulation:

1. **Simple Simulation**: Instant results based on team ratings and randomness
2. **AI Commentary**: Full play-by-play commentary using Groq/Llama 3.1

### Tournament Management
- Admin can start tournament when 8 teams are registered
- Automatic bracket generation (random team placement)
- Real-time bracket updates
- Admin can reset tournament at any time

### Public Pages
- Tournament bracket (visual tree structure)
- Match details (commentary for "played", results for "simulated")
- Top scorers leaderboard
- Tournament history (past winners and statistics)

### Analytics Dashboard
- Team performance statistics
- Player goal contributions
- Win/loss records
- Interactive charts and visualizations

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

## Deployment

The application is deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Testing

### Manual Testing Checklist
- [ ] Register as representative and create team
- [ ] Admin can start tournament with 8 teams
- [ ] Simulate match (simple mode)
- [ ] Play match with AI commentary
- [ ] Email notifications sent after matches
- [ ] Public bracket view updates in real-time
- [ ] Top scorers leaderboard accurate
- [ ] Tournament reset preserves history
- [ ] Analytics dashboard shows correct data
- [ ] Real-life team data imports correctly
- [ ] All 3 roles have appropriate access

## Known Issues

- Authentication is currently placeholder (will be implemented with Firebase Auth)
- Email notifications require proper domain setup
- AI commentary may occasionally fail (fallback implemented)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is created for educational purposes as part of the INF4001N entrance exam.

## Support

For questions or issues, please contact the development team or create an issue in the repository.

---

**African Nations League Tournament Platform** - Built with ❤️ for African football

