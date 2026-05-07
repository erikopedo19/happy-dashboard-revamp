# Test Email Function - Current Booking Confirmation Flow

Use this guide to manually test the current `send-booking-confirmation` email flow used by the public booking page.

## What the app does today

After a successful booking, the app calls the Supabase Edge Function:

- `send-booking-confirmation`

That function currently:

- sends email through **Resend**
- does **not** require JWT verification
- expects a JSON payload with booking details
- sends the confirmation to the **customer's email address**
- uses `RESEND_API_KEY` from Supabase Edge Function secrets
- uses `onboarding@resend.dev` as the sender

## Important current behavior

The booking itself and the confirmation email are separate steps:

1. the appointment is created
2. the email function is called
3. if email fails, the booking can still succeed

So when testing, verify both:

- booking creation
- email delivery

---

## Prerequisites

Before testing, make sure:

1. the Supabase project is the correct one:
   - `idcifrhzlmxcdihzdtmn`
2. the Edge Function `send-booking-confirmation` is deployed
3. the secret `RESEND_API_KEY` is set in Supabase
4. your Resend key is valid
5. if using `onboarding@resend.dev`, you are sending only to an address allowed by Resend's testing restrictions

---

## Option 1: Test from Supabase Dashboard

This is the fastest way to confirm the function itself works.

### Step 1: Open your project

1. Go to the Supabase dashboard
2. Open project `idcifrhzlmxcdihzdtmn`
3. Open **Edge Functions**
4. Select `send-booking-confirmation`

### Step 2: Verify the secret

In Edge Function secrets, confirm:

- `RESEND_API_KEY` exists
- the value starts with `re_`

If it is missing, add it before testing.

### Step 3: Invoke the function manually

Use a payload like this:

```/dev/null/test-email-payload.json#L1-14
{
  "customerEmail": "your-email@example.com",
  "customerName": "John Doe",
  "customerPhone": "555-1234",
  "businessName": "Cutzio Barber Shop",
  "serviceName": "Haircut & Beard Trim",
  "appointmentDate": "Monday, January 15, 2025",
  "appointmentTime": "14:00",
  "price": 45,
  "notes": "Fade on sides, keep length on top",
  "bookingId": "abc12345",
  "accentColor": "#1a1a1a",
  "stylistName": "Marco",
  "stylistTitle": "Senior Barber"
}
```

### Step 4: Expected result

A successful response should look generally like:

```/dev/null/success-response.json#L1-6
{
  "success": true,
  "data": {
    "id": "..."
  }
}
```

If successful:

- check the recipient inbox
- check spam/junk folder
- check the Resend dashboard for delivery status

---

## Option 2: Test through the public booking page

This tests the real user flow.

### Step 1: Open a live booking link

Open a public booking page in the browser, for example:

- `/book/{booking-link}`

### Step 2: Complete a booking

Fill in the booking form with:

- customer name
- customer email
- customer phone if desired
- service
- date
- time
- notes if desired

Then submit the booking.

### Step 3: Verify booking success

You should see the booking success state in the app.

Also verify in Supabase that the appointment was created.

### Step 4: Verify email success

Check the customer's inbox for the booking confirmation email.

The current email should include:

- business name
- service name
- appointment date
- appointment time
- price if provided
- stylist name if provided
- notes if provided
- booking reference if provided

---

## Option 3: Test from a script or HTTP client

If you want to test the function directly outside the UI, send a POST request to:

```/dev/null/function-url.txt#L1-1
https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-booking-confirmation
```

### Example request body

```/dev/null/curl-body.json#L1-14
{
  "customerEmail": "your-email@example.com",
  "customerName": "Test User",
  "customerPhone": "555-1234",
  "businessName": "Cutzio",
  "serviceName": "Haircut",
  "appointmentDate": "January 15, 2025",
  "appointmentTime": "2:00 PM",
  "price": 25,
  "notes": "Test booking",
  "bookingId": "test123",
  "accentColor": "#1a1a1a",
  "stylistName": "Test Barber",
  "stylistTitle": "Barber"
}
```

### Example `curl`

```/dev/null/test-email.sh#L1-18
curl -X POST "https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-booking-confirmation" \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "your-email@example.com",
    "customerName": "Test User",
    "customerPhone": "555-1234",
    "businessName": "Cutzio",
    "serviceName": "Haircut",
    "appointmentDate": "January 15, 2025",
    "appointmentTime": "2:00 PM",
    "price": 25,
    "notes": "Test booking",
    "bookingId": "test123",
    "accentColor": "#1a1a1a",
    "stylistName": "Test Barber",
    "stylistTitle": "Barber"
  }'
```

---

## Expected payload fields

The current function supports these fields:

```/dev/null/payload-fields.md#L1-13
customerEmail
customerName
customerPhone
businessName
serviceName
appointmentDate
appointmentTime
price
notes
bookingId
accentColor
stylistName
stylistTitle
```

### Minimum required fields

At minimum, provide:

```/dev/null/min-required-fields.md#L1-5
customerEmail
businessName
serviceName
appointmentDate
appointmentTime
```

Providing `customerName` is also strongly recommended so the email greeting is correct.

---

## Current implementation notes

The current deployed function is Resend-based.

It is not using the older MailerLite flow for booking confirmations.

It also currently accepts direct public invocation because JWT verification is disabled on the function.

That means:

- browser clients can call it directly
- access is simpler for testing
- abuse protection is limited unless additional controls are added later

---

## Troubleshooting

## 1. Function returns `503` or says email service is not configured

Cause:

- `RESEND_API_KEY` is missing in Supabase Edge Function secrets

Fix:

1. open Supabase dashboard
2. go to Edge Functions secrets
3. add `RESEND_API_KEY`
4. redeploy if needed
5. test again

---

## 2. Function returns `400 Missing required fields`

Cause:

- one or more required payload fields are missing

Fix:

Make sure the request includes at least:

- `customerEmail`
- `businessName`
- `serviceName`
- `appointmentDate`
- `appointmentTime`

---

## 3. Function returns `500`

Possible causes:

- invalid Resend key
- Resend sender restrictions
- malformed response from Resend
- unexpected runtime error in the function

Fix:

1. check Edge Function logs in Supabase
2. check the Resend dashboard
3. verify `RESEND_API_KEY`
4. verify the destination email is allowed if using `onboarding@resend.dev`

---

## 4. Booking succeeds but no email arrives

Cause:

- the appointment insert succeeded
- the confirmation call failed afterward, or the message was blocked/delayed

Fix:

1. verify the appointment exists in the database
2. check browser console for the function call result
3. check Supabase Edge Function logs
4. check Resend delivery logs
5. check spam/junk folders

---

## 5. Email works in direct invocation but not from the booking page

Likely causes:

- the booking page is sending unexpected fields
- the booking page is not sending one of the required fields
- a client-side error occurs before or after booking creation

Fix:

1. test the function directly from dashboard first
2. compare the successful manual payload with what the app sends
3. inspect browser console and network requests
4. confirm the booking page is still calling `send-booking-confirmation`

---

## What to verify after a successful test

After a full successful test, confirm all of the following:

- appointment record was created
- customer received the email
- subject line looks correct
- appointment details are correct in the email
- stylist details appear when available
- booking reference appears when available
- accent color renders as expected
- Resend shows successful delivery

---

## Recommended test cases

### Test Case 1: Minimal payload

Test with only the required fields and confirm the email still sends.

### Test Case 2: Full payload

Test with all supported fields:

- phone
- price
- notes
- booking ID
- accent color
- stylist name
- stylist title

### Test Case 3: Real booking flow

Create an appointment from the public booking page and confirm:

- booking succeeds
- email is delivered

### Test Case 4: Invalid request

Omit a required field and confirm the function returns an error.

---

## Current sender and recipient behavior

### Sender

The current function sends from:

```/dev/null/from-address.txt#L1-1
onboarding@resend.dev
```

### Recipient

The current function sends to:

```/dev/null/to-behavior.txt#L1-1
customerEmail
```

There is no guaranteed business BCC in the current deployed implementation.

If you need a copy sent to the business inbox as well, that would require an additional function update.

---

## Summary

The current booking confirmation flow is:

1. booking is created
2. `send-booking-confirmation` is invoked
3. Resend sends the email to the customer
4. booking remains valid even if email delivery fails

When in doubt, test the function directly first, then test the full booking flow.