# Deploy Booking Confirmation Email Function

This guide reflects the **current** booking confirmation email setup in this project.

## What the current function does

The deployed `send-booking-confirmation` Edge Function currently:

- uses **Resend**
- has `verify_jwt = false`
- sends booking confirmation emails directly to the **customer email**
- expects a JSON payload from the app
- reads the `RESEND_API_KEY` secret from the Supabase function environment

## Current payload shape

The booking page sends these fields to `send-booking-confirmation`:

- `customerEmail`
- `customerName`
- `customerPhone`
- `businessName`
- `serviceName`
- `appointmentDate`
- `appointmentTime`
- `price`
- `notes`
- `bookingId`
- `accentColor`
- `stylistName`
- `stylistTitle`

Notes:

- `accentColor` is supported by the currently deployed function.
- Extra fields sent by the frontend are ignored unless the function uses them.
- The current deployed function does **not** require the older MailerLite secrets.

---

## 1. Prerequisites

Before deploying, make sure you have:

- a Supabase project
- access to the project `idcifrhzlmxcdihzdtmn`
- a Resend account
- a valid Resend API key starting with `re_`

Optional for production:

- a verified sending domain in Resend

---

## 2. Set the required secret

The current function requires this secret:

- `RESEND_API_KEY`

### Using the Supabase Dashboard

1. Open your Supabase project.
2. Go to **Edge Functions**.
3. Open **Secrets**.
4. Add:

```/dev/null/env.txt#L1-1
RESEND_API_KEY=re_your_actual_api_key_here
```

### Using the CLI

```/dev/null/cli.sh#L1-1
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

---

## 3. Review the current sender address

The current deployed function sends from:

```/dev/null/from.txt#L1-1
onboarding@resend.dev
```

That is fine for testing, but it has an important limitation:

- Resend's test sender is usually only suitable for sending to verified or controlled recipient addresses.

For real production sending, switch to your own verified domain, for example:

```/dev/null/from.txt#L1-1
Cutzio Bookings <bookings@yourdomain.com>
```

If you change the sender in the function source, redeploy the function after saving.

---

## 4. Deploy the function

Deploy the Edge Function named:

```/dev/null/function-name.txt#L1-1
send-booking-confirmation
```

### Standard deploy

```/dev/null/deploy.sh#L1-1
supabase functions deploy send-booking-confirmation
```

### If you need to explicitly keep it public

The currently live function is public (`verify_jwt = false`). If your local deployment flow requires it, deploy with JWT verification disabled:

```/dev/null/deploy.sh#L1-1
supabase functions deploy send-booking-confirmation --no-verify-jwt
```

Use the option that matches your Supabase setup.

---

## 5. Confirm the frontend integration

The public booking flow currently invokes:

```/dev/null/invoke.txt#L1-1
send-booking-confirmation
```

After a booking is successfully inserted, the app sends a confirmation email attempt and continues even if email delivery fails.

That means:

- booking creation should still succeed if email delivery fails
- email problems should be treated separately from appointment creation problems

---

## 6. Test the function directly

Use a payload shaped like the current function expects.

Example:

```/dev/null/payload.json#L1-14
{
  "customerEmail": "test@example.com",
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
  "stylistName": "Alex",
  "stylistTitle": "Senior Barber"
}
```

### Invoke from the Dashboard

1. Open **Edge Functions** in Supabase.
2. Select `send-booking-confirmation`.
3. Open the **Invoke** tab.
4. Paste the JSON payload above.
5. Run the function.
6. Check the response and your Resend dashboard.

### Invoke from the CLI

```/dev/null/invoke.sh#L1-1
supabase functions invoke send-booking-confirmation --body '{"customerEmail":"test@example.com","customerName":"John Doe","customerPhone":"555-1234","businessName":"Cutzio Barber Shop","serviceName":"Haircut & Beard Trim","appointmentDate":"Monday, January 15, 2025","appointmentTime":"14:00","price":45,"notes":"Fade on sides, keep length on top","bookingId":"abc12345","accentColor":"#1a1a1a","stylistName":"Alex","stylistTitle":"Senior Barber"}'
```

---

## 7. Test through the app

To test the real booking flow:

1. Open a public booking link.
2. Fill out the booking form with a real email address you can access.
3. Submit the booking.
4. Confirm:
   - the appointment is created successfully
   - the frontend shows booking success
   - a confirmation email is sent

If the booking succeeds but no email arrives, the likely issue is in the function configuration or sender setup, not the booking insert itself.

---

## 8. Expected success and failure behavior

### Success case

A healthy function run should return a response similar to:

```/dev/null/response.json#L1-6
{
  "success": true,
  "data": {
    "id": "some-resend-email-id"
  }
}
```

### Common failure case

If `RESEND_API_KEY` is missing, the function should return a `503`-style error payload similar to:

```/dev/null/error.json#L1-4
{
  "success": false,
  "error": "Email service not configured. Please set RESEND_API_KEY..."
}
```

If required fields are missing, the function should return a `400`-style error such as:

```/dev/null/error.json#L1-4
{
  "success": false,
  "error": "Missing required fields"
}
```

---

## 9. Troubleshooting

## Function deploys but email is not sent

Check:

- `RESEND_API_KEY` exists in Supabase secrets
- the API key is active in Resend
- the sender address is allowed by Resend
- the recipient address is valid
- the Edge Function logs show a successful Resend response

## Booking succeeds but no email arrives

This usually means:

- the appointment insert worked
- the confirmation email call failed afterward

Check:

- browser console logs from the booking page
- Edge Function logs
- Resend email activity

## Resend rejects the send

Common reasons:

- using `onboarding@resend.dev` for recipients not allowed in test mode
- unverified production domain
- invalid API key
- malformed payload

## Missing fields error

The function currently requires at minimum:

- `customerEmail`
- `businessName`
- `serviceName`

In practice, you should always send the full booking payload shown earlier.

---

## 10. Recommended production improvements

The current implementation works, but these improvements are recommended:

1. move to a verified custom sending domain
2. avoid exposing a fully public confirmation endpoint unless necessary
3. validate the payload more strictly
4. align the repository function source with the currently deployed function
5. remove outdated MailerLite-only deployment instructions from related docs
6. keep the frontend payload and function contract in sync

---

## 11. Current stack summary

Current state of the booking confirmation email flow:

- **provider:** Resend
- **function name:** `send-booking-confirmation`
- **auth mode:** public function (`verify_jwt = false`)
- **required secret:** `RESEND_API_KEY`
- **used by:** public booking flow after appointment creation

---

## 12. Quick deployment checklist

- [ ] Create or confirm your Resend API key
- [ ] Set `RESEND_API_KEY` in Supabase secrets
- [ ] Confirm sender address strategy
- [ ] Deploy `send-booking-confirmation`
- [ ] Test direct invocation with sample JSON
- [ ] Test via a real booking in the app
- [ ] Verify delivery in Resend logs

---

## 13. Important note about outdated docs

Some older files in this project reference:

- MailerLite
- old local Windows paths
- older assumptions about the email implementation

Use this document as the source of truth for the **current booking confirmation function** unless and until the function is changed again.