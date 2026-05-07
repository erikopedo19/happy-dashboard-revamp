// Test script for Mailerlite integration
import { 
  verifyConnection, 
  sendTestEmail, 
  createSubscriber, 
  getSubscriber,
  sendAppointmentConfirmation 
} from './mailerlite';

async function runTests() {
  console.log('🔧 Testing Mailerlite Integration\n');
  console.log('================================\n');

  // Test 1: Verify API Connection
  console.log('Test 1: Verifying API connection...');
  const connectionResult = await verifyConnection();
  if (connectionResult.success) {
    console.log('✅ API connection successful');
    console.log('   Account:', connectionResult.data?.name || 'Connected');
  } else {
    console.log('❌ API connection failed:', connectionResult.error);
  }
  console.log('');

  // Test 2: Create a test subscriber
  console.log('Test 2: Creating test subscriber...');
  const subscriberResult = await createSubscriber('test@example.com', {
    name: 'Test User',
    source: 'test-script',
  });
  if (subscriberResult.success) {
    console.log('✅ Subscriber created successfully');
  } else {
    console.log('❌ Failed to create subscriber:', subscriberResult.error);
  }
  console.log('');

  // Test 3: Get subscriber
  console.log('Test 3: Fetching subscriber...');
  const getResult = await getSubscriber('test@example.com');
  if (getResult.success) {
    console.log('✅ Subscriber found');
  } else if (getResult.notFound) {
    console.log('ℹ️ Subscriber not found (may not exist yet)');
  } else {
    console.log('❌ Error fetching subscriber:', getResult.error);
  }
  console.log('');

  // Test 4: Send test email
  console.log('Test 4: Sending test email...');
  const emailResult = await sendTestEmail();
  if (emailResult.success) {
    console.log('✅ Test email sent successfully');
    console.log('   Email ID:', emailResult.data?.id);
  } else {
    console.log('❌ Failed to send test email:', emailResult.error);
    console.log('\n⚠️ Note: Mailerlite primarily supports newsletters and campaigns.');
    console.log('   For transactional emails, you may need to use Resend or another service.');
  }
  console.log('');

  // Test 5: Send appointment confirmation
  console.log('Test 5: Sending appointment confirmation...');
  const confirmResult = await sendAppointmentConfirmation({
    to: 'erikballiu19@gmail.com',
    customerName: 'Test Customer',
    serviceName: 'Haircut',
    date: '2026-03-10',
    time: '14:00',
    stylist: 'John Doe',
  });
  if (confirmResult.success) {
    console.log('✅ Appointment confirmation sent');
  } else {
    console.log('❌ Failed to send confirmation:', confirmResult.error);
  }
  console.log('');

  console.log('================================');
  console.log('Testing complete!');
}

runTests().catch(console.error);
