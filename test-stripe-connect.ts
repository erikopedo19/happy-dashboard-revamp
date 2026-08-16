// Test script for Stripe Connect function
// Run with: deno run --allow-net --allow-env test-stripe-connect.ts

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

console.log("Testing Stripe Connect configuration...");
console.log("STRIPE_SECRET_KEY exists:", !!STRIPE_SECRET_KEY);
console.log("SUPABASE_URL exists:", !!SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!SUPABASE_SERVICE_ROLE_KEY);

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is not configured");
  Deno.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are not configured");
  Deno.exit(1);
}

// Test Stripe API connection
async function testStripeConnection() {
  try {
    const response = await fetch("https://api.stripe.com/v1/accounts", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2024-06-20",
      },
    });

    if (response.ok) {
      console.log("✅ Stripe API connection successful");
      const data = await response.json();
      console.log(`Found ${data.data.length} existing Stripe accounts`);
    } else {
      console.error("❌ Stripe API connection failed:", response.status, response.statusText);
      const text = await response.text();
      console.error("Error details:", text);
    }
  } catch (error) {
    console.error("❌ Stripe API connection error:", error);
  }
}

testStripeConnection();