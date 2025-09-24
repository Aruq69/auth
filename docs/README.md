# MailGuard Documentation

## System Diagrams

This documentation contains comprehensive system diagrams for the MailGuard email security application.

### Available Diagrams

1. **[Entity Relationship Diagram (ERD)](./ERD.md)** - Database schema and relationships
2. **[Data Flow Diagram (DFD)](./DFD.md)** - System data flow and processes
3. **[Use Case Diagram](./UseCase.md)** - User interactions and system functionality
4. **[ML Algorithm Flow](./MLFlow.md)** - Machine learning processing pipeline
5. **[System Architecture](./Architecture.md)** - Overall system architecture and components

### About MailGuard

MailGuard is an AI-powered email security platform that integrates with Microsoft Outlook to:
- Analyze emails for security threats using machine learning
- Provide real-time security advice and recommendations
- Send security alerts for suspicious emails
- Offer administrative controls and analytics
- Support multi-factor authentication and user management

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Authentication**: Supabase Auth with MFA support
- **Email Integration**: Microsoft Graph API (Outlook)
- **ML Processing**: Custom classifiers and security analyzers
- **Deployment**: Vercel with GitHub integration