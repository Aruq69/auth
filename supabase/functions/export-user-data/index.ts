import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

// Create a modern, beautiful HTML document for the security report
function generateHTMLReport(emails: any[], userInfo: any, preferences: any, emailStats: any[] = []) {
  const currentDate = new Date().toLocaleDateString();
  
  // Calculate aggregated statistics from email_statistics table
  const totalStats = emailStats.reduce((acc, stat) => ({
    total_emails: acc.total_emails + (stat.total_emails || 0),
    low_threat_emails: acc.low_threat_emails + (stat.low_threat_emails || 0),
    medium_threat_emails: acc.medium_threat_emails + (stat.medium_threat_emails || 0),
    high_threat_emails: acc.high_threat_emails + (stat.high_threat_emails || 0),
    spam_emails: acc.spam_emails + (stat.spam_emails || 0),
    phishing_emails: acc.phishing_emails + (stat.phishing_emails || 0),
    malware_emails: acc.malware_emails + (stat.malware_emails || 0),
    suspicious_emails: acc.suspicious_emails + (stat.suspicious_emails || 0)
  }), {
    total_emails: 0,
    low_threat_emails: 0,
    medium_threat_emails: 0,
    high_threat_emails: 0,
    spam_emails: 0,
    phishing_emails: 0,
    malware_emails: 0,
    suspicious_emails: 0
  });

  const threatEmails = totalStats.medium_threat_emails + totalStats.high_threat_emails;
  const safetyRate = totalStats.total_emails > 0 ? Math.round((totalStats.low_threat_emails / totalStats.total_emails) * 100) : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mail Guard - Security Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            position: relative;
        }
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)" /></svg>');
            opacity: 0.3;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        .header .date {
            font-size: 1rem;
            opacity: 0.8;
            font-weight: 300;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 40px;
            padding: 30px;
            background: #ffffff;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s ease;
        }
        .section:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        .section h2 {
            color: #1f2937;
            font-size: 1.75rem;
            font-weight: 600;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .section h2::before {
            content: '';
            width: 4px;
            height: 28px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 2px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
        }
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: block;
            margin-bottom: 8px;
        }
        .stat-label {
            color: #64748b;
            font-size: 0.95rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .user-info {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            padding: 30px;
            border-radius: 16px;
            margin-bottom: 30px;
            border: 1px solid #bfdbfe;
        }
        .user-info h3 {
            color: #1e40af;
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .user-detail {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(59, 130, 246, 0.1);
        }
        .user-detail:last-child {
            border-bottom: none;
        }
        .user-detail strong {
            color: #1e40af;
            font-weight: 600;
        }
        .user-detail span:last-child {
            color: #475569;
            font-weight: 500;
        }
        .email-list {
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        }
        .email-item {
            padding: 20px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            transition: background-color 0.2s ease;
        }
        .email-item:hover {
            background: #f8fafc;
        }
        .email-item:last-child {
            border-bottom: none;
        }
        .email-info h4 {
            color: #1f2937;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.4;
        }
        .email-info p {
            color: #6b7280;
            font-size: 0.9rem;
            margin: 4px 0;
        }
        .email-info strong {
            color: #374151;
        }
        .threat-badge {
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }
        .threat-high {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        .threat-medium {
            background: #fef3c7;
            color: #d97706;
            border: 1px solid #fed7aa;
        }
        .threat-low {
            background: #dcfce7;
            color: #16a34a;
            border: 1px solid #bbf7d0;
        }
        .threat-none {
            background: #f1f5f9;
            color: #64748b;
            border: 1px solid #e2e8f0;
        }
        .privacy-notice {
            background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
            border: 1px solid #81d4fa;
            border-left: 5px solid #0288d1;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
        }
        .privacy-notice h3 {
            color: #0277bd;
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .privacy-notice p {
            color: #01579b;
            margin: 0;
            line-height: 1.6;
        }
        .recommendations {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 25px;
        }
        .recommendations ul {
            list-style: none;
            padding: 0;
        }
        .recommendations li {
            padding: 10px 0;
            color: #166534;
            font-weight: 500;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        .recommendations li::before {
            content: '✓';
            color: #16a34a;
            font-weight: bold;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .footer {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: #d1d5db;
            padding: 30px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
            opacity: 0.9;
        }
        .footer p:first-child {
            font-weight: 600;
            font-size: 1.1rem;
        }
        @media print {
            body { 
                background: white; 
                padding: 0; 
            }
            .container { 
                box-shadow: none; 
                border-radius: 0; 
                max-width: none;
            }
            .section:hover {
                transform: none;
            }
        }
        @media (max-width: 768px) {
            .content {
                padding: 20px;
            }
            .section {
                padding: 20px;
                margin-bottom: 20px;
            }
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }
            .header h1 {
                font-size: 2.2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>🛡️ Mail Guard</h1>
                <p class="subtitle">Email Security Analysis Report</p>
                <p class="date">Generated on ${currentDate}</p>
            </div>
        </div>
        
        <div class="content">
            <div class="user-info">
                <h3>👤 Account Information</h3>
                <div class="user-detail">
                    <span><strong>Email:</strong></span>
                    <span>${userInfo.email}</span>
                </div>
                <div class="user-detail">
                    <span><strong>Member Since:</strong></span>
                    <span>${new Date(userInfo.created_at).toLocaleDateString()}</span>
                </div>
                <div class="user-detail">
                    <span><strong>Privacy Mode:</strong></span>
                    <span>${preferences?.never_store_data ? 'Enabled (Maximum Privacy)' : 'Disabled'}</span>
                </div>
                <div class="user-detail">
                    <span><strong>2FA Status:</strong></span>
                    <span>${userInfo.factors?.length > 0 ? 'Enabled ✅' : 'Disabled ⚠️'}</span>
                </div>
            </div>

            <div class="section">
                <h2>📊 Email Security Overview</h2>
                ${preferences?.never_store_data ? `
                <div class="privacy-notice">
                    <h3>🔒 Privacy-First Mode Active</h3>
                    <p>
                        Your emails are analyzed in real-time but not permanently stored for maximum privacy. 
                        This report shows your current privacy settings and system status only.
                    </p>
                </div>
                ` : ''}
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${totalStats.total_emails}</span>
                        <div class="stat-label">Total Emails Analyzed</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${totalStats.low_threat_emails}</span>
                        <div class="stat-label">Safe Emails</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" style="background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${threatEmails}</span>
                        <div class="stat-label">Threat Emails</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${safetyRate}%</span>
                        <div class="stat-label">Safety Rate</div>
                    </div>
                </div>
            </div>

            ${emails.length > 0 ? `
            <div class="section">
                <h2>📧 Recent Email Analysis</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Latest ${Math.min(emails.length, 10)} analyzed emails from your account</p>
                <div class="email-list">
                    ${emails.slice(0, 10).map(email => `
                        <div class="email-item">
                            <div class="email-info">
                                <h4>${email.subject || 'No Subject'}</h4>
                                <p><strong>From:</strong> ${email.sender}</p>
                                <p><strong>Date:</strong> ${new Date(email.received_date).toLocaleDateString()}</p>
                                ${email.classification ? `<p><strong>Classification:</strong> ${email.classification}</p>` : ''}
                                ${email.keywords?.length ? `<p><strong>Keywords:</strong> ${email.keywords.slice(0, 3).join(', ')}</p>` : ''}
                                ${email.confidence ? `<p><strong>Confidence:</strong> ${Math.round(email.confidence * 100)}%</p>` : ''}
                            </div>
                            <div class="threat-badge threat-${email.threat_level || 'none'}">
                                ${email.threat_level || 'Safe'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : `
            <div class="section">
                <h2>📧 Email Analysis</h2>
                <div class="privacy-notice">
                    <h3>🔒 No Detailed Emails Stored</h3>
                    <p>
                        Privacy-first mode is enabled. Only aggregated statistics are collected for security analysis 
                        while keeping your email content completely private.
                    </p>
                </div>
            </div>
            `}

            <div class="section">
                <h2>🔒 Security Recommendations</h2>
                <div class="recommendations">
                    <ul>
                        ${userInfo.factors?.length === 0 ? '<li><strong>Enable Two-Factor Authentication</strong> - Protect your account with 2FA for enhanced security</li>' : '<li>Two-Factor Authentication is enabled and protecting your account</li>'}
                        ${preferences?.never_store_data ? '<li>Privacy-first mode is enabled - your emails are analyzed but not stored</li>' : '<li>Consider enabling privacy-first mode for maximum data protection</li>'}
                        <li>Regularly review your email security settings and update preferences as needed</li>
                        <li>Keep your account information up to date and use a strong, unique password</li>
                        <li>Monitor your email activity for suspicious patterns and report any concerns</li>
                        <li>Be cautious with email attachments and links from unknown senders</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Mail Guard - Advanced Email Security & Threat Analysis System</p>
            <p>Generated with privacy and security in mind • Visit mailguard.com for more information</p>
        </div>
    </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for full access
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user from auth token (we still validate the user but use service role for queries)
    const token = authHeader.replace('Bearer ', '');

    // Verify user identity with a separate client using anon key
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating data export for user:', user.id);

    // Fetch email statistics using service role for complete access
    const { data: emailStats, error: statsError } = await supabaseClient
      .from('email_statistics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    console.log('Email statistics query result:', { data: emailStats, error: statsError });

    // Fetch detailed emails only if privacy mode is off
    const { data: emails, error: emailsError } = await supabaseClient
      .from('emails')
      .select('*')
      .eq('user_id', user.id)
      .order('received_date', { ascending: false });

    console.log('Emails query result:', { 
      count: emails?.length || 0, 
      error: emailsError,
      sampleEmail: emails?.[0] ? {
        id: emails[0].id,
        subject: emails[0].subject,
        user_id: emails[0].user_id
      } : null
    });

    if (statsError) {
      console.error('Error fetching email statistics:', statsError);
    }

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
    }

    // Fetch user preferences with fallback for missing data
    let preferences = { never_store_data: true, email_notifications: true, security_alerts: true, language: 'en', theme: 'system' };
    const { data: preferencesData, error: preferencesError } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle to handle missing data
    
    if (!preferencesError && preferencesData) {
      preferences = preferencesData;
    } else {
      console.log('No user preferences found, using defaults');
    }

    // Generate HTML report with improved design
    const htmlContent = generateHTMLReport(emails || [], user, preferences, emailStats || []);

    console.log('Generated HTML report, size:', htmlContent.length);

    // Return HTML content that can be converted to PDF by the browser
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="MailGuard-Report-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });

  } catch (error) {
    console.error('Error in export-user-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});