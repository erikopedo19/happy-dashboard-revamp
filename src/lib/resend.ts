// Resend API client for sending emails
// IMPORTANT: Replace 're_xxxxxxxxx' with your actual Resend API key

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || 're_xxxxxxxxx';
const resend = new Resend(RESEND_API_KEY);

// Default recipient for testing - all emails will go here for now
const DEFAULT_RECIPIENT = 'erikballiu19@gmail.com';

// Example: Send a test email
export async function sendTestEmail() {
  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: DEFAULT_RECIPIENT,
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
  });

  if (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }

  console.log('Email sent successfully:', data);
  return { success: true, data };
}

// Generic email sending function - all emails go to DEFAULT_RECIPIENT for testing
export async function sendEmail({
  to,
  subject,
  html,
  from = 'onboarding@resend.dev',
}: {
  to?: string; // Optional - will use DEFAULT_RECIPIENT if not provided
  subject: string;
  html: string;
  from?: string;
}) {
  const { data, error } = await resend.emails.send({
    from,
    to: DEFAULT_RECIPIENT, // All emails go to erikballiu19@gmail.com for now
    subject,
    html,
  });

  if (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

export { resend, DEFAULT_RECIPIENT };
