// Mailerlite API client for sending emails
// Using JWT token for authentication
// IMPORTANT: Set MAILERLITE_API_KEY in your .env file

const MAILERLITE_API_KEY = process.env.VITE_MAILERLITE_API_KEY || process.env.MAILERLITE_API_KEY;

if (!MAILERLITE_API_KEY) {
  console.warn('⚠️ MAILERLITE_API_KEY not set. Email functionality will not work.');
}

const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api';

// Default recipient for testing
const DEFAULT_RECIPIENT = 'erikballiu19@gmail.com';

interface MailerliteSubscriber {
  email: string;
  fields?: Record<string, any>;
}

interface EmailSendResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Create or update a subscriber in Mailerlite
 */
export async function createSubscriber(email: string, fields?: Record<string, any>) {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        fields: fields || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Mailerlite subscriber creation failed:', error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error creating subscriber:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get subscriber by email
 */
export async function getSubscriber(email: string) {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/subscribers/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, notFound: true };
      }
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send a campaign email via Mailerlite
 * Note: Mailerlite uses campaigns for bulk emails. For transactional emails,
 * consider using their automation or a different service.
 */
export async function sendCampaignEmail({
  name,
  subject,
  html,
  from,
  to,
}: {
  name: string;
  subject: string;
  html: string;
  from: string;
  to: string[];
}): Promise<EmailSendResponse> {
  try {
    // First create a campaign
    const campaignResponse = await fetch(`${MAILERLITE_API_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name,
        type: 'regular',
        emails: [{
          subject,
          content: html,
          from_name: from.split('<')[0]?.trim() || 'Barbershop',
          from: from.includes('<') ? from.match(/<(.+)>/)?.[1] : from,
        }],
      }),
    });

    if (!campaignResponse.ok) {
      const error = await campaignResponse.text();
      console.error('Campaign creation failed:', error);
      return { success: false, error };
    }

    const campaign = await campaignResponse.json();

    // Schedule/send the campaign immediately
    const scheduleResponse = await fetch(`${MAILERLITE_API_URL}/campaigns/${campaign.data.id}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        delivery: 'instant',
      }),
    });

    if (!scheduleResponse.ok) {
      const error = await scheduleResponse.text();
      console.error('Campaign scheduling failed:', error);
      return { success: false, error };
    }

    return { success: true, data: campaign.data };
  } catch (error) {
    console.error('Error sending campaign:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send a simple transactional email
 * For Mailerlite, we use the single email endpoint or automation
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = 'onboarding@resend.dev',
  text,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}): Promise<EmailSendResponse> {
  try {
    // Ensure subscriber exists
    const subscriberResult = await createSubscriber(to, {
      last_sent_at: new Date().toISOString(),
    });

    if (!subscriberResult.success) {
      console.warn('Could not create subscriber, continuing anyway:', subscriberResult.error);
    }

    // For transactional emails, we'll use a different approach
    // Mailerlite is primarily for newsletters, so we might need to use
    // their automation feature or another service
    
    // Try to send via their single email endpoint if available
    const response = await fetch(`${MAILERLITE_API_URL}/transactional-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: to }],
        from: { email: from, name: 'Barbershop' },
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Mailerlite email failed:', errorData);
      
      // Fallback: Log the email details for debugging
      console.log('Email details:', { to, subject, from });
      
      return { 
        success: false, 
        error: `Mailerlite API error: ${response.status} - ${errorData}` 
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send test email to verify integration
 */
export async function sendTestEmail(): Promise<EmailSendResponse> {
  return sendEmail({
    to: DEFAULT_RECIPIENT,
    subject: 'Test Email from Barbershop App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hello from Barbershop!</h2>
        <p>This is a test email sent via Mailerlite integration.</p>
        <p>If you received this, the email integration is working correctly!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
      </div>
    `,
  });
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation({
  to,
  customerName,
  serviceName,
  date,
  time,
  stylist,
}: {
  to: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  stylist?: string;
}) {
  return sendEmail({
    to,
    subject: 'Appointment Confirmed!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hi ${customerName},</h2>
        <p>Your appointment has been confirmed!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #555;">Appointment Details</h3>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          ${stylist ? `<p><strong>Stylist:</strong> ${stylist}</p>` : ''}
        </div>
        <p style="color: #666;">We look forward to seeing you!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">This is an automated message from our booking system.</p>
      </div>
    `,
  });
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminder({
  to,
  customerName,
  serviceName,
  date,
  time,
  stylist,
}: {
  to: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  stylist?: string;
}) {
  return sendEmail({
    to,
    subject: 'Reminder: Your Upcoming Appointment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hi ${customerName},</h2>
        <p>This is a friendly reminder about your upcoming appointment.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #555;">Appointment Details</h3>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          ${stylist ? `<p><strong>Stylist:</strong> ${stylist}</p>` : ''}
        </div>
        <p style="color: #666;">We look forward to seeing you soon!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">This is an automated reminder from our booking system.</p>
      </div>
    `,
  });
}

/**
 * Get account info to verify API connection
 */
export async function verifyConnection() {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Mailerlite connection failed:', error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error verifying connection:', error);
    return { success: false, error: String(error) };
  }
}

export { DEFAULT_RECIPIENT };
