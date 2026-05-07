// Test script for email confirmation
// Run with: node test-email.js

const testEmailFunction = async () => {
  console.log('🧪 Testing Email Confirmation Function\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const testData = {
    customerEmail: 'test@example.com',
    customerName: 'John Doe',
    customerPhone: '555-1234',
    businessName: 'Cutzio Barber Shop',
    serviceName: 'Haircut & Beard Trim',
    appointmentDate: 'Monday, January 15, 2025',
    appointmentTime: '14:00',
    price: 45,
    notes: 'Fade on sides, keep length on top',
    bookingId: 'abc12345'
  };

  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Replace with your Supabase project URL
    const SUPABASE_URL = 'https://idcifrhzlmxcdihzdtmn.supabase.co';
    const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-booking-confirmation`;

    console.log('📡 Calling edge function...');
    console.log(`URL: ${FUNCTION_URL}\n`);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your anon key here if needed for testing
        // 'Authorization': 'Bearer YOUR_ANON_KEY'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n📧 Check creativedesignsdevs@gmail.com for the email!');
    } else {
      console.error('❌ FAILED!');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

// Run the test
testEmailFunction();
