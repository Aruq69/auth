# Entity Relationship Diagram (ERD)

## Overview
This ERD shows the complete database schema for MailGuard, including all tables, relationships, and key constraints that support user management, email analysis, security features, and administrative functions.

## Database Schema

```mermaid
erDiagram
    profiles ||--o{ emails : "user_id"
    profiles ||--o{ feedback : "user_id"
    profiles ||--o{ user_onboarding_progress : "user_id"
    profiles ||--o{ user_roles : "user_id"
    profiles ||--o{ mfa_secrets : "user_id"
    profiles ||--o{ user_sessions : "user_id"
    profiles ||--o{ audit_logs : "user_id"
    profiles ||--o{ alert_emails : "user_id"
    
    emails ||--o{ feedback : "email_id"
    emails ||--o{ alert_emails : "email_id"
    
    profiles {
        uuid id PK
        text email
        text full_name
        text avatar_url
        boolean is_outlook_connected
        text outlook_access_token
        text outlook_refresh_token
        timestamp outlook_token_expires_at
        timestamp created_at
        timestamp updated_at
    }
    
    emails {
        uuid id PK
        uuid user_id FK
        text outlook_message_id
        text sender_email
        text sender_name
        text subject
        text body_preview
        text security_classification
        float confidence_score
        jsonb analysis_results
        text raw_headers
        timestamp received_at
        timestamp created_at
        timestamp updated_at
    }
    
    feedback {
        uuid id PK
        uuid user_id FK
        uuid email_id FK
        text feedback_type
        text feedback_text
        integer rating
        text category
        timestamp created_at
    }
    
    user_onboarding_progress {
        uuid id PK
        uuid user_id FK
        jsonb completed_steps
        boolean is_completed
        timestamp created_at
        timestamp updated_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        text role
        timestamp created_at
    }
    
    mfa_secrets {
        uuid id PK
        uuid user_id FK
        text encrypted_secret
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }
    
    user_sessions {
        uuid id PK
        uuid user_id FK
        text session_token
        timestamp expires_at
        timestamp created_at
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        text action
        text resource_type
        text resource_id
        jsonb details
        text ip_address
        text user_agent
        timestamp created_at
    }
    
    alert_emails {
        uuid id PK
        uuid user_id FK
        uuid email_id FK
        text alert_type
        text subject
        text content
        text status
        timestamp sent_at
        timestamp created_at
    }
```

## Table Descriptions

### Core User Management
- **profiles**: Extended user information beyond Supabase auth
- **user_roles**: Role-based access control (admin/user)
- **user_sessions**: Session management for extended functionality
- **mfa_secrets**: Multi-factor authentication secrets storage

### Email Processing
- **emails**: Processed email data with ML analysis results
- **alert_emails**: Security alert notifications sent to users

### User Experience
- **feedback**: User feedback on email classifications and system
- **user_onboarding_progress**: Tracks user onboarding completion
- **audit_logs**: Security and action logging for compliance

## Key Relationships

1. **User-Email**: One user can have many emails analyzed
2. **Email-Feedback**: Each email can receive user feedback
3. **User-Alerts**: Users receive security alert emails
4. **User-Audit**: All user actions are logged for security
5. **User-MFA**: Each user can have MFA enabled with secret storage

## Security Features

- Row Level Security (RLS) enabled on all tables
- User isolation through user_id foreign keys
- Encrypted storage for sensitive data (MFA secrets)
- Comprehensive audit logging
- Token-based session management