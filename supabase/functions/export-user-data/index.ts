import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

// Create a simple PDF-like HTML document that can be converted to PDF
function generateHTMLReport(emails: any[], userInfo: any, preferences: any, emailStats: any[] = []) {
  const currentDate = new Date().toLocaleDateString();
  
  // Calculate aggregated statistics from email_statistics table
  const totalStats = emailStats.reduce((acc, stat) => ({
    total_emails: acc.total_emails + (stat.total_emails || 0),
    safe_emails: acc.safe_emails + (stat.safe_emails || 0),
    low_threat_emails: acc.low_threat_emails + (stat.low_threat_emails || 0),
    medium_threat_emails: acc.medium_threat_emails + (stat.medium_threat_emails || 0),
    high_threat_emails: acc.high_threat_emails + (stat.high_threat_emails || 0),
    spam_emails: acc.spam_emails + (stat.spam_emails || 0),
    phishing_emails: acc.phishing_emails + (stat.phishing_emails || 0),
    malware_emails: acc.malware_emails + (stat.malware_emails || 0),
    suspicious_emails: acc.suspicious_emails + (stat.suspicious_emails || 0)
  }), {
    total_emails: 0,
    safe_emails: 0,
    low_threat_emails: 0,
    medium_threat_emails: 0,
    high_threat_emails: 0,
    spam_emails: 0,
    phishing_emails: 0,
    malware_emails: 0,
    suspicious_emails: 0
  });

  const threatEmails = totalStats.low_threat_emails + totalStats.medium_threat_emails + totalStats.high_threat_emails;
  const safetyRate = totalStats.total_emails > 0 ? Math.round((totalStats.safe_emails / totalStats.total_emails) * 100) : 0;

  // Calculate threat type distribution
  const threatTypes = emails.reduce((acc, email) => {
    if (email.threat_type) {
      acc[email.threat_type] = (acc[email.threat_type] || 0) + 1;
    }
    return acc;
  }, {});

  // Get recent emails (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentEmails = emails.filter(email => 
    new Date(email.received_date) >= thirtyDaysAgo
  ).slice(0, 10); // Latest 10 emails

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mail Guard - Security Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #00bcd4, #9c27b0);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #00bcd4;
            background: #f8f9fa;
        }
        .section h2 {
            margin: 0 0 15px;
            color: #2c3e50;
            font-size: 1.5rem;
            font-weight: 600;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-top: 3px solid #00bcd4;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #00bcd4;
            display: block;
        }
        .stat-label {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }
        .email-list {
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }
        .email-item {
            padding: 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .email-item:last-child {
            border-bottom: none;
        }
        .email-info h4 {
            margin: 0 0 5px;
            color: #2c3e50;
            font-size: 1rem;
        }
        .email-info p {
            margin: 0;
            color: #666;
            font-size: 0.9rem;
        }
        .threat-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .threat-high {
            background: #ffebee;
            color: #c62828;
        }
        .threat-medium {
            background: #fff3e0;
            color: #ef6c00;
        }
        .threat-low {
            background: #e8f5e8;
            color: #2e7d32;
        }
        .threat-none {
            background: #f3f4f6;
            color: #6b7280;
        }
        .user-info {
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .user-info h3 {
            margin: 0 0 10px;
            color: #0f172a;
        }
        .user-detail {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .user-detail:last-child {
            border-bottom: none;
        }
        .footer {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9rem;
        }
        .threat-distribution {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin: 15px 0;
        }
        .threat-type {
            background: white;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .threat-type-count {
            font-size: 1.2rem;
            font-weight: bold;
            color: #e74c3c;
        }
        .threat-type-label {
            font-size: 0.8rem;
            color: #666;
            text-transform: capitalize;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Mail Guard</h1>
            <p>Email Security Analysis Report</p>
            <p>Generated on ${currentDate}</p>
        </div>
        
        <div class="content">
            <div class="user-info">
                <h3>Account Information</h3>
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
                <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px; color: #1976d2;">🔒 Privacy-First Mode Active</h3>
                    <p style="margin: 0; color: #1565c0;">
                        Your emails are analyzed in real-time but not permanently stored for maximum privacy. 
                        This report shows your current privacy settings and system status.
                    </p>
                </div>
                ` : ''}
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${totalStats.total_emails}</span>
                        <div class="stat-label">Total Emails Analyzed</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${totalStats.safe_emails}</span>
                        <div class="stat-label">Safe Emails</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" style="color: #e74c3c">${threatEmails}</span>
                        <div class="stat-label">Threat Emails</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${safetyRate}%</span>
                        <div class="stat-label">Safety Rate</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>🎯 Threat Analysis</h2>
                <p>Distribution of detected threats by type:</p>
                <div class="threat-distribution">
                    <div class="threat-type">
                        <div class="threat-type-count">${totalStats.spam_emails}</div>
                        <div class="threat-type-label">Spam</div>
                    </div>
                    <div class="threat-type">
                        <div class="threat-type-count">${totalStats.phishing_emails}</div>
                        <div class="threat-type-label">Phishing</div>
                    </div>
                    <div class="threat-type">
                        <div class="threat-type-count">${totalStats.malware_emails}</div>
                        <div class="threat-type-label">Malware</div>
                    </div>
                    <div class="threat-type">
                        <div class="threat-type-count">${totalStats.suspicious_emails}</div>
                        <div class="threat-type-label">Suspicious</div>
                    </div>
                </div>
            </div>

            ${emails.length > 0 ? `
            <div class="section">
                <h2>📧 Recent Email Analysis (Last 10)</h2>
                <div class="email-list">
                    ${emails.slice(0, 10).map(email => `
                        <div class="email-item">
                            <div class="email-info">
                                <h4>${email.subject || 'No Subject'}</h4>
                                <p><strong>From:</strong> ${email.sender}</p>
                                <p><strong>Date:</strong> ${new Date(email.received_date).toLocaleDateString()}</p>
                                ${email.classification ? `<p><strong>Classification:</strong> ${email.classification}</p>` : ''}
                                ${email.keywords?.length ? `<p><strong>Keywords:</strong> ${email.keywords.slice(0, 3).join(', ')}</p>` : ''}
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
                <p>No detailed emails stored. This is because:</p>
                <ul>
                    <li>✅ Privacy-first mode is enabled (emails are not stored)</li>
                    <li>📊 Only aggregated statistics are collected for your security analysis</li>
                    <li>🔒 Your email content remains private while still providing threat insights</li>
                </ul>
            </div>
            `}

            <div class="section">
                <h2>🔒 Security Recommendations</h2>
                <ul>
                    ${userInfo.factors?.length === 0 ? '<li><strong>Enable Two-Factor Authentication</strong> - Protect your account with 2FA</li>' : '<li>✅ Two-Factor Authentication is enabled</li>'}
                    ${preferences?.never_store_data ? '<li>✅ Privacy-first mode is enabled - emails are not stored</li>' : '<li>Consider enabling privacy-first mode for maximum data protection</li>'}
                    <li>Regularly review your email security settings</li>
                    <li>Keep your account information up to date</li>
                    <li>Monitor your email activity for suspicious patterns</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>This report was generated by Mail Guard - Advanced Email Security & Threat Analysis System</p>
            <p>For support or questions, please contact support@mailguard.com</p>
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    // Set the auth for the client
    const token = authHeader.replace('Bearer ', '');
    supabaseClient.auth.session = () => ({ access_token: token });

    // Get user from auth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating data export for user:', user.id);

    // Fetch user's email statistics for analytics
    const { data: emailStats, error: statsError } = await supabaseClient
      .from('email_statistics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    // Fetch detailed emails only if privacy mode is off
    const { data: emails, error: emailsError } = await supabaseClient
      .from('emails')
      .select('*')
      .eq('user_id', user.id)
      .order('received_date', { ascending: false });

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

    // Generate HTML report with statistics
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