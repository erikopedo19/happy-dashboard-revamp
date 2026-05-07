# Email Confirmation Setup with Resend

This guide explains how to configure booking confirmation emails for the current `send-booking-confirmation` Supabase Edge Function.

## What the current function does

The deployed booking confirmation flow currently uses:

- **Provider:** Resend
- **Function name:** `send-booking-confirmation`
- **Auth mode:** public function invocation allowed
- **Required secret:** `RESEND_API_KEY`
- **Current sender:** `onboarding@resend.dev`

The function sends a booking confirmation email directly to the customer email address passed in the request.

## Current request payload

The function currently expects a JSON body like this:

```/dev/null/payload.json#L1-14
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "555-1234",
  "businessName": "Cutzio Barber Shop",
  "serviceName": "Haircut & Beard Trim",
  "appointmentDate": "Monday, January 15, 2025",
  "appointmentTime": "14:00",
  "price": 45,
  "notes": "Fade on sides",
  "bookingId": "abc12345",
  "accentColor": "#1a1a1a",
  "stylistName": "Alex",
  "stylistTitle": "Senior Barber"
}
```

## Required fields

These fields are required by the current function:

- `customerEmail`
- `businessName`
- `serviceName`

In practice, you should also send:

- `customerName`
- `appointmentDate`
- `appointmentTime`

## Optional fields

These fields are optional and enhance the email template:

- `customerPhone`
- `price`
- `notes`
- `bookingId`
- `accentColor`
- `stylistName`
- `stylistTitle`

## Important behavior notes

### 1. The function is Resend-based
Older local files in the repo may mention MailerLite or older email flows. The current booking confirmation function behavior is based on **Resend**.

### 2. The function uses `RESEND_API_KEY`
You must configure `RESEND_API_KEY` in Supabase Edge Function secrets. Without it, the function returns a configuration error.

### 3. The current sender is the Resend test sender
The function currently sends from:

```/dev/null/from.txt#L1-1
onboarding@resend.dev
```

This is suitable for testing. For production, you should switch to a verified custom domain in Resend.

### 4. No BCC is currently configured
If older docs mention sending a copy to `creativedesignsdevs@gmail.com`, that is **not** part of the current deployed function behavior.

### 5. The function does not currently require JWT
The current deployment allows invocation without JWT verification. If you want stricter access control later, update the function and deployment configuration.

---

## Setup Steps

## 1. Create a Resend account

1. Go to https://resend.com
2. Create or sign in to your account
3. Open the API keys page
4. Create a new API key
5. Copy the key that starts with `re_`

## 2. Add the Resend key to Supabase

Set the `RESEND_API_KEY` secret in your Supabase project.

### Option A: Supabase Dashboard

1. Open your Supabase project
2. Go to **Edge Functions**
3. Open **Secrets**
4. Add:

```/dev/null/secrets.env#L1-1
RESEND_API_KEY=re_your_actual_api_key_here
```

### Option B: Supabase CLI

```/dev/null/cli.sh#L1-1
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

## 3. Deploy the function

Deploy the `send-booking-confirmation` Edge Function after updating code or secrets.

Example:

```/dev/null/deploy.sh#L1-1
supabase functions deploy send-booking-confirmation --no-verify-jwt
```

Use `--no-verify-jwt` only if you want deployment behavior to match the currently public function setup.

## 4. Test the function directly

Send a test payload to confirm the function is working.

Example body:

```/dev/null/test-payload.json#L1-12
{
  "customerEmail": "test@example.com",
  "customerName": "Test User",
  "businessName": "Cutzio",
  "serviceName": "Haircut",
  "appointmentDate": "January 15, 2025",
  "appointmentTime": "2:00 PM",
  "price": 30,
  "notes": "Test booking",
  "bookingId": "test123",
  "accentColor": "#1a1a1a"
}
```

## 5. Test from the app

After deployment:

1. Open the public booking page
2. Submit a booking with a real email address
3. Confirm the booking succeeds
4. Check the recipient inbox
5. Check function logs if the email does not arrive

---

## What the current email includes

The current Resend email template includes:

- Confirmation heading
- Customer greeting
- Business name
- Service name
- Appointment date
- Appointment time
- Price, when provided
- Notes, when provided
- Stylist name and title, when provided
- Booking reference, when provided
- Accent color in the header

## Current subject format

The current function sends emails with this subject format:

```/dev/null/subject.txt#L1-1
Booking Confirmation - {businessName}
```

Example:

```/dev/null/example-subject.txt#L1-1
Booking Confirmation - Cutzio Barber Shop
```

---

## Resend sender options

## Test mode

For testing, the current function uses:

```/dev/null/test-sender.txt#L1-1
onboarding@resend.dev
```

This is convenient for initial setup and debugging.

## Production mode

For production, use a verified domain in Resend and update the sender to something like:

```/dev/null/production-sender.txt#L1-1
Cutzio Bookings <bookings@yourdomain.com>
```

To do that:

1. Go to https://resend.com/domains
2. Add your domain
3. Configure the DNS records Resend provides
4. Wait for verification
5. Update the function sender
6. Redeploy the function

---

## Troubleshooting

## Error: `RESEND_API_KEY not set`

Cause:
- The secret is missing in Supabase

Fix:
- Add `RESEND_API_KEY` in Edge Function secrets
- Redeploy if needed
- Retry the function

## Error: `Missing required fields`

Cause:
- The request body is missing one or more required values

Fix:
- Ensure at least these fields are sent:
  - `customerEmail`
  - `businessName`
  - `serviceName`

## Email not received

Check these in order:

1. Verify the function returned success
2. Check the Edge Function logs
3. Check the Resend dashboard
4. Check spam/junk folders
5. Confirm the email address sent in `customerEmail` is correct
6. Confirm your Resend account and sender setup allow delivery to that address

## Function deploys but app still fails silently

Possible causes:
- Client payload does not match the function shape
- Client is sending extra fields but missing required ones
- The app is swallowing email errors after booking creation

Fix:
- Confirm the booking request body matches the current function contract
- Check browser console logs
- Check Edge Function logs
- Verify booking creation and email sending are separate success paths

---

## Notes about repo drift

Some files in the repo may still refer to:

- MailerLite
- older testing instructions
- BCC behavior
- outdated local paths
- older Windows-specific deploy examples

Treat the deployed `send-booking-confirmation` function as the source of truth unless you intentionally replace it.

---

## Recommended next improvements

If you want to harden this email flow, the next good improvements are:

1. Validate all important fields, not just the minimum
2. Sanitize user-provided text before embedding in HTML
3. Move booking confirmation sending fully server-side
4. Add structured logging
5. Add retry/error reporting
6. Use a verified production sender domain
7. Optionally require authenticated or secret-protected invocation

---

## Quick checklist

- [ ] Create a Resend API key
- [ ] Add `RESEND_API_KEY` to Supabase secrets
- [ ] Deploy `send-booking-confirmation`
- [ ] Test direct invocation
- [ ] Test a real booking through the app
- [ ] Verify delivery in Resend
- [ ] Replace test sender with a verified domain for production