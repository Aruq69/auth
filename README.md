# MailGuard - Email Security Analysis Platform

MailGuard is a comprehensive email security platform that helps users analyze, secure, and manage their email communications. The platform provides AI-powered security insights, threat detection, and proactive recommendations to protect against email-based attacks.

## Features

### 🔒 Email Security Analysis
- Real-time email threat detection and classification
- AI-powered security recommendations
- Comprehensive email pattern analysis
- Breach detection and security scoring

### 🤖 Intelligent Chat Assistant
- Interactive AI assistant for email security guidance
- Contextual security advice based on email content
- Real-time threat analysis and recommendations

### 🔐 Advanced Authentication
- Multi-factor authentication (MFA) support
- Secure user onboarding and profile management
- OAuth integration with Gmail

### 📊 Security Insights Dashboard
- Detailed security analytics and reporting
- User behavior pattern analysis
- Threat trend visualization

### 📧 Gmail Integration
- Seamless Gmail account connection
- Automated email fetching and analysis
- Real-time security monitoring

### 💬 Feedback System
- User feedback collection and analysis
- Continuous improvement through user insights
- Rating and review system

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Backend**: Supabase (Database, Authentication, Edge Functions)
- **AI Integration**: Groq API for intelligent analysis
- **Email Integration**: Gmail API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Supabase account and project setup
- Groq API key for AI functionality

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mailguard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
Run the provided SQL schema file in your Supabase project:
```bash
# Import mailguard_consolidated_schema.sql to your Supabase project
```

5. Deploy Supabase Edge Functions:
```bash
# Deploy all edge functions to your Supabase project
supabase functions deploy
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   └── ui/             # Reusable UI components
├── pages/              # Main application pages
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and helpers
└── integrations/       # External service integrations

supabase/
├── functions/          # Edge functions for backend logic
└── migrations/         # Database schema and migrations
```

## Key Components

- **EmailSubmissionForm**: Submit emails for security analysis
- **EmailSecurityAdvice**: Display AI-powered security recommendations
- **ChatAssistant**: Interactive AI chat for security guidance
- **SecurityInsights**: Analytics dashboard for security metrics
- **MFASetup/MFAChallenge**: Multi-factor authentication flow
- **UserOnboarding**: New user setup and configuration

## API Endpoints

The platform uses Supabase Edge Functions for backend processing:

- `email-classifier`: Classify and analyze email threats
- `email-security-advisor`: Generate AI-powered security advice
- `chat-assistant`: Handle chat interactions with AI
- `gmail-auth`: Manage Gmail OAuth authentication
- `fetch-gmail-emails`: Retrieve emails from Gmail
- `store-feedback`: Save user feedback
- `check-password-breach`: Verify password security

## Security Features

- Password breach detection using HaveIBeenPwned API
- Row Level Security (RLS) policies in database
- Encrypted data storage and transmission
- Secure authentication flows
- Privacy-focused design

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.