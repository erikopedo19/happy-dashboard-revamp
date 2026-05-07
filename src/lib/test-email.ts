// Test script to send a test email using Resend
import 'dotenv/config';
import { sendTestEmail } from './resend';

async function runTest() {
  console.log('Sending test email...');
  const result = await sendTestEmail();
  
  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log('Email ID:', result.data?.id);
  } else {
    console.error('❌ Failed to send test email:', result.error);
  }
}

runTest();
