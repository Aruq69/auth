# MailGuard Test Scenarios & Test Cases

## Overview
This document outlines key test scenarios and test cases for the MailGuard email security platform. Each scenario includes preconditions, test steps, and expected results.

---

## Scenario 1: User Authentication & Onboarding

### Test Case 1.1: Successful Outlook OAuth Login
**Priority:** High  
**Preconditions:** 
- User has valid Microsoft Outlook account
- Application is accessible

**Test Steps:**
1. Navigate to `/auth` page
2. Click "Continue with Outlook" button
3. Enter valid Microsoft credentials
4. Approve permissions request

**Expected Result:**
- User is authenticated successfully
- User profile is created in `profiles` table
- Default user role is assigned in `user_roles` table
- User is redirected to dashboard (`/`)

**Data Validation:**
- `profiles.user_id` matches authenticated user ID
- `user_roles.role` is set to 'user'
- `user_preferences` record is created with privacy-first defaults (`never_store_data = TRUE`)

---

### Test Case 1.2: MFA Setup Flow
**Priority:** High  
**Preconditions:**
- User is authenticated
- MFA is not yet configured

**Test Steps:**
1. Navigate to Settings page
2. Click "Enable MFA" option
3. Scan QR code with authenticator app
4. Enter verification code
5. Save MFA configuration

**Expected Result:**
- MFA is enabled for user account
- Backup codes are generated and displayed
- Future logins require MFA challenge

---

## Scenario 2: Outlook Integration & Email Sync

### Test Case 2.1: Connect Outlook Account
**Priority:** Critical  
**Preconditions:**
- User is authenticated
- Outlook tokens do not exist for user

**Test Steps:**
1. Navigate to Settings page
2. Click "Connect Outlook" button
3. Complete OAuth authorization
4. Grant email read permissions

**Expected Result:**
- Access token and refresh token stored in `outlook_tokens` table
- `outlook_tokens.email_address` matches user's Outlook email
- `outlook_tokens.expires_at` is set correctly
- Email sync is triggered automatically

**Data Validation:**
- `outlook_tokens.user_id` matches authenticated user
- Tokens are encrypted/stored securely
- `fetch-outlook-emails` edge function is invoked

---

### Test Case 2.2: Automatic Email Sync & Classification
**Priority:** Critical  
**Preconditions:**
- Outlook account is connected
- User has emails in Outlook inbox

**Test Steps:**
1. Trigger email sync (automatic or manual)
2. Wait for `fetch-outlook-emails` function to complete
3. Verify emails are classified by `robust-email-classifier`

**Expected Result:**
- Emails are fetched from Outlook API
- Each email is stored in `emails` table with:
  - `classification` (safe/suspicious/malicious)
  - `threat_level` (safe/low/medium/high)
  - `threat_type` (spam/phishing/malware/suspicious)
  - `confidence` score (0-1)
  - `keywords` array extracted
- `email_statistics` table is updated via `increment_email_statistics()` function

**Data Validation:**
- `emails.user_id` matches authenticated user
- `emails.message_id` is unique
- `emails.processed_at` timestamp is set
- Statistics counters increment correctly

---

## Scenario 3: Email Threat Detection & Security Advice

### Test Case 3.1: High Threat Email Detection
**Priority:** Critical  
**Preconditions:**
- User has authenticated
- Phishing/malware email exists in database

**Test Steps:**
1. Navigate to dashboard
2. Locate email with `threat_level = 'high'`
3. Click on the email to view details
4. Observe EmailSecurityAdvice component

**Expected Result:**
- Email is highlighted with red/critical alert indicator
- Security advice is automatically generated via `email-security-advisor` edge function
- AI-powered advice includes:
  - Threat explanation
  - Specific indicators found
  - Recommended actions
  - Why it's dangerous

**Data Validation:**
- `emails.threat_level = 'high'`
- `emails.confidence >= 0.7`
- Security advice contains actionable guidance

---

### Test Case 3.2: Email Alert Creation
**Priority:** High  
**Preconditions:**
- High or medium threat email detected
- User has `security_alerts = true` in preferences

**Test Steps:**
1. System detects threat email via classifier
2. Alert is automatically created in `email_alerts` table
3. User navigates to `/alerts` page
4. User views alert details

**Expected Result:**
- Alert record created with:
  - `alert_type = 'suspicious'` or specific threat type
  - `status = 'pending'`
  - `alert_message` describes the threat
- Alert is visible on User Alerts page
- User can acknowledge/dismiss alert

---

## Scenario 4: Chat Assistant for Email Analysis

### Test Case 4.1: Ask Question About Specific Email
**Priority:** Medium  
**Preconditions:**
- User is viewing dashboard
- At least one email exists in database

**Test Steps:**
1. Click floating chat button (ShieldCheck icon)
2. Select an email from the list
3. Type question: "Is this email safe to open?"
4. Submit question

**Expected Result:**
- `chat-assistant` edge function is invoked
- AI analyzes email content, sender, threat indicators
- Response provides:
  - Safety assessment
  - Reasoning based on email attributes
  - Specific warnings if applicable
- Conversation context is maintained

**Data Validation:**
- Request includes `selectedEmail.id`
- Response references actual email data
- Uses Lovable AI Gateway (GROQ_API_KEY or OPENAI_API_KEY)

---

### Test Case 4.2: General Security Advice via Chat
**Priority:** Medium  
**Preconditions:**
- User opens chat assistant
- No specific email selected

**Test Steps:**
1. Open chat assistant
2. Ask: "What are common signs of phishing emails?"
3. Review response

**Expected Result:**
- AI provides educational content about email security
- Response includes common phishing indicators
- Advice is contextual to MailGuard features

---

## Scenario 5: User Feedback & Reporting

### Test Case 5.1: Submit Feedback on Email Classification
**Priority:** Medium  
**Preconditions:**
- User is viewing an analyzed email
- Email has classification (safe/threat)

**Test Steps:**
1. Click "Provide Feedback" button on email
2. Select feedback type: "Classification Issue"
3. Choose category: "False Positive" or "False Negative"
4. Enter description: "This email was marked as spam but is legitimate"
5. Submit feedback

**Expected Result:**
- Feedback stored in `user_feedback` table with:
  - `feedback_type` and `category`
  - `feedback_text` with user description
  - `user_id` and `email` (optional)
  - `page_url` and `user_agent` captured
- `send-feedback-email` edge function sends notification to admin
- Confirmation toast displayed to user

---

### Test Case 5.2: Export User Data (GDPR Compliance)
**Priority:** High  
**Preconditions:**
- User has data stored in system
- User is authenticated

**Test Steps:**
1. Navigate to Settings page
2. Click "Export My Data" button
3. Confirm export request

**Expected Result:**
- `export-user-data` edge function is triggered
- JSON file generated containing:
  - Profile information
  - All emails analyzed
  - Alerts history
  - Preferences
- Download link provided or file emailed to user

---

## Scenario 6: Admin Dashboard - User Management

### Test Case 6.1: Admin Views All Users
**Priority:** High  
**Preconditions:**
- Admin user is authenticated (`user_roles.role = 'admin'`)

**Test Steps:**
1. Navigate to `/admin/users`
2. View users table

**Expected Result:**
- All users from `profiles` table are displayed
- Each user shows:
  - Username/email
  - Account creation date
  - Role assignment
  - Last activity
- Admin can filter/search users

**Data Validation:**
- `is_admin(auth.uid())` RLS policy allows access
- Non-admin users cannot access this page (redirect/403)

---

### Test Case 6.2: Admin Manages Email Alerts
**Priority:** High  
**Preconditions:**
- Admin is authenticated
- Email alerts exist in database

**Test Steps:**
1. Navigate to `/admin/alerts`
2. Filter alerts by status: "Pending"
3. Select an alert
4. Update `admin_action` to "Investigated"
5. Add `admin_notes`: "Confirmed phishing attempt, user notified"
6. Change `status` to "resolved"
7. Save changes

**Expected Result:**
- Alert record updated in `email_alerts` table
- `admin_user_id` set to current admin
- `updated_at` timestamp refreshed
- Action logged in `admin_audit_log` table with:
  - `action_type = 'alert_update'`
  - `target_id` = alert ID
  - `action_details` JSON contains changes

---

## Scenario 7: Privacy Settings & Data Control

### Test Case 7.1: Enable "Never Store Data" Mode
**Priority:** Critical (Privacy Feature)  
**Preconditions:**
- User is authenticated
- User has existing emails in database

**Test Steps:**
1. Navigate to Settings page
2. Locate "Privacy" section
3. Toggle "Never store my email data" to ON
4. Confirm privacy mode activation

**Expected Result:**
- `user_preferences.never_store_data` set to `TRUE`
- Existing emails in `emails` table are:
  - Either deleted immediately, OR
  - Flagged for deletion on next sync
- Future emails are analyzed in-memory only (not persisted)
- User receives confirmation: "Privacy mode enabled. Email data will not be stored."

**Data Validation:**
- `emails` table has no records for this user (or flagged for deletion)
- Real-time analysis still works without persistence
- Statistics may be limited or anonymized

---

### Test Case 7.2: Disable Email Notifications
**Priority:** Low  
**Preconditions:**
- User has `email_notifications = true`

**Test Steps:**
1. Navigate to Settings
2. Toggle "Email Notifications" to OFF
3. Save preferences

**Expected Result:**
- `user_preferences.email_notifications = FALSE`
- User no longer receives email alerts for threats
- In-app alerts still function normally

---

## Scenario 8: ML Analytics & Model Performance

### Test Case 8.1: View ML Model Accuracy Dashboard
**Priority:** Medium  
**Preconditions:**
- Admin user authenticated
- ML classification data exists

**Test Steps:**
1. Navigate to `/ml-analytics`
2. View AccuracyDashboard component
3. Select date range filter
4. Review metrics

**Expected Result:**
- Dashboard displays:
  - Overall model accuracy
  - Precision/Recall/F1 scores
  - Confusion matrix
  - Classification distribution by threat type
- Charts render using Recharts library
- Data sourced from `emails` table aggregations

---

### Test Case 8.2: Real-Time ML Analysis Testing
**Priority:** Medium  
**Preconditions:**
- User has classifier access
- Test dataset available

**Test Steps:**
1. Navigate to ML Testing page
2. Upload sample email text or paste content
3. Click "Analyze" button
4. Review classification results

**Expected Result:**
- `robust-email-classifier` edge function processes input
- Returns:
  - Classification label
  - Confidence score
  - Threat indicators detected
  - Processing time
- Results displayed in real-time (<3 seconds)

---

## Scenario 9: Edge Function Error Handling

### Test Case 9.1: Expired Outlook Token Refresh
**Priority:** Critical  
**Preconditions:**
- Outlook token exists but `expires_at < now()`
- User attempts email sync

**Test Steps:**
1. Trigger email sync (automatic or manual)
2. `fetch-outlook-emails` detects expired token
3. Function attempts token refresh using `refresh_token`

**Expected Result:**
- Refresh token is used to obtain new access token
- `outlook_tokens` table updated with:
  - New `access_token`
  - New `expires_at` timestamp
  - Same `refresh_token` (or new if rotated)
- Email sync continues without user intervention

**Error Handling:**
- If refresh fails (invalid token):
  - User session flagged for re-authentication
  - `OutlookSessionTimeoutDialog` displayed
  - User redirected to re-connect Outlook

---

### Test Case 9.2: Classifier API Timeout
**Priority:** High  
**Preconditions:**
- Email classification in progress
- External ML API (Hugging Face/Python API) is slow/unresponsive

**Test Steps:**
1. Submit email for classification
2. API takes >30 seconds to respond
3. Edge function timeout occurs

**Expected Result:**
- Email marked with `classification = 'error'` or `null`
- `processed_at` timestamp set
- Fallback classification applied (e.g., "unknown" threat level)
- Error logged for admin review
- User sees: "Analysis in progress, check back shortly"
- Retry mechanism triggers classification attempt later

---

## Scenario 10: Audit Logging & Compliance

### Test Case 10.1: Admin Action Audit Trail
**Priority:** High  
**Preconditions:**
- Admin performs sensitive action (e.g., role change, alert resolution)

**Test Steps:**
1. Admin updates user role from 'user' to 'admin'
2. System captures action in `admin_audit_log`
3. Navigate to `/admin/audit` page
4. Search for recent action

**Expected Result:**
- Audit log entry created with:
  - `action_type = 'role_change'`
  - `admin_user_id` = acting admin
  - `target_type = 'user'`
  - `target_id` = affected user ID
  - `action_details` JSON: `{"old_role": "user", "new_role": "admin"}`
  - `created_at` timestamp
- Audit log is immutable (no UPDATE/DELETE RLS policies)
- Searchable and filterable by date, admin, action type

---

## Cross-Cutting Test Cases

### Performance Tests
- **Email Sync Speed:** 100 emails should sync and classify in <60 seconds
- **Dashboard Load Time:** Initial page load <2 seconds with 50+ emails
- **Real-time Analysis:** Classification response <3 seconds per email

### Security Tests
- **RLS Policy Verification:** User A cannot access User B's emails via direct API calls
- **Token Security:** Outlook tokens encrypted at rest in database
- **XSS Prevention:** Email content sanitized before rendering in UI
- **CSRF Protection:** All state-changing operations require valid session token

### Accessibility Tests
- **Keyboard Navigation:** All interactive elements accessible via Tab/Enter
- **Screen Reader Compatibility:** Threat level alerts announced correctly
- **Color Contrast:** WCAG AA compliance for all text/background combinations

---

## Test Data Requirements

### Sample Emails for Testing
1. **Safe Email:** Legitimate newsletter with known sender
2. **Spam Email:** Marketing email with suspicious links
3. **Phishing Email:** Fake "urgent" request with credential harvesting link
4. **Malware Email:** Attachment with executable file extension
5. **False Positive:** Legitimate email with security trigger words

### Test Accounts
- **Regular User:** `testuser@outlook.com`
- **Admin User:** `admin@mailguard.app`
- **New User:** For onboarding flow testing

---

## Regression Test Checklist

After each major release, verify:
- [ ] User authentication (Outlook OAuth)
- [ ] Email sync and classification
- [ ] Threat detection accuracy (compare against baseline)
- [ ] Alert generation and admin workflow
- [ ] Privacy mode functionality
- [ ] Chat assistant responses
- [ ] Admin dashboard access controls
- [ ] Edge function deployments successful
- [ ] Database migrations applied correctly
- [ ] RLS policies enforced
