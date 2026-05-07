# Quick Email Setup Guide

## 🚀 Fast Setup (5 minutes)

### Step 1: Get Resend API Key
```bash
1. Go to https://resend.com/signup
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy the key (starts with re_)
```

### Step 2: Add API Key to Supabase
```bash
# Option A: Via Supabase CLI
supabase secrets set RESEND_API_KEY=re_your_key_here

# Option B: Via Supabase Dashboard
# Settings > Edge Functions > Secrets > Add Secret
# Name: RESEND_API_KEY
# Value: re_your_key_here
```

### Step 3: Deploy Edge Function
```bash
cd c:\Users\xmaxe\Desktop\cutzio.beta
supabase functions deploy send-booking-confirmation
```

### Step 4: Update Email From Address (Optional)
If using your own domain, edit:
`supabase/functions/send-booking-confirmation/index.ts`

Change line 48:
```typescript
from: 'Cutzio Bookings <bookings@yourdomain.com>',
```

Then redeploy:
```bash
supabase functions deploy send-booking-confirmation
```

## ✅ That's it!

Emails will now be sent automatically when:
- Customers book appointments via the public booking page
- You create appointments in the dashboard (if customer has email)

## 📧 Email Details

**From:** bookings@creativedesignsdevs.com (or your domain)
**To:** Customer email
**BCC:** creativedesignsdevs@gmail.com (always gets a copy)

**Includes:**
- Service name
- Date & time
- Price
- Notes
- Professional HTML design

## 🧪 Testing

1. Create a test booking with your email
2. Check your inbox for confirmation
3. Check creativedesignsdevs@gmail.com for BCC copy
4. View logs: `supabase functions logs send-booking-confirmation`

## 🔧 Troubleshooting

**No emails received?**
```bash
# Check function logs
supabase functions logs send-booking-confirmation

# Verify secret is set
supabase secrets list

# Check Resend dashboard
https://resend.com/emails
```

**Domain not verified?**
- Use Resend's test domain: `onboarding@resend.dev`
- Or verify your domain in Resend dashboard

## 📊 Limits (Free Tier)
- 100 emails/day
- 3,000 emails/month
- Upgrade at https://resend.com/pricing if needed
