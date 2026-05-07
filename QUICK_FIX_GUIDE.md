# 🔧 Quick Fix Guide - Booking Error 1005

## Problem
Bookings are failing with Supabase error 1005. This is caused by a database constraint that prevents multiple appointments at the same time.

## Solution
Apply the database fixes to remove the restrictive constraint and add proper error handling.

---

## 🚀 Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/idcifrhzlmxcdihzdtmn
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply the Fix
1. Open the file: `APPLY_THESE_FIXES.sql`
2. Copy the **entire contents** of the file
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Success
You should see messages like:
- ✓ Dropped restrictive unique constraint
- ✓ Added primary_color column to brand_profiles
- ✓ Updated get_public_profile_by_booking_link function
- ✓ All fixes applied successfully!

---

## 🖥️ Method 2: Using Supabase CLI

### Prerequisites
```bash
npm install -g supabase
```

### Apply Migrations
```powershell
# Run the PowerShell script
.\apply-migrations.ps1

# Or manually:
supabase link --project-ref idcifrhzlmxcdihzdtmn
supabase db push
```

---

## ✅ Testing After Fix

### Test 1: Create a Booking
1. Get your booking link from Settings → Booking Page
2. Open the booking link in an incognito window
3. Select a service, date, and time
4. Fill in customer details
5. Click "Confirm Booking"
6. ✓ Should succeed without error 1005

### Test 2: Multiple Bookings at Same Time
1. Create a booking for a specific time slot
2. Try to create another booking for the same time
3. ✓ Should now work (previously would fail with error 1005)

### Test 3: Error Messages
1. Try accessing an invalid booking link
2. ✓ Should show clear error message with error code
3. Check browser console for detailed logs

---

## 📋 What Was Fixed

### 1. **Removed Restrictive Constraint**
- **Before**: Only one appointment allowed per time slot
- **After**: Multiple appointments allowed (handled by app logic)
- **Why**: Allows flexibility for multiple stylists, overlapping services

### 2. **Added Brand Color Support**
- **Before**: RPC function didn't return brand_color
- **After**: Returns brand_color from brand_profiles table
- **Why**: Booking form needs this for styling

### 3. **Enhanced Error Handling**
- **Before**: Generic error messages
- **After**: Specific error codes and helpful messages
- **Why**: Easier to diagnose and fix issues

---

## 🐛 Troubleshooting

### Still Getting Error 1005?
1. Make sure you ran the SQL fix completely
2. Check if the constraint still exists:
   ```sql
   SELECT conname FROM pg_constraint 
   WHERE conrelid = 'public.appointments'::regclass;
   ```
3. Manually drop it:
   ```sql
   ALTER TABLE public.appointments 
   DROP CONSTRAINT appointments_user_id_appointment_date_appointment_time_key;
   ```

### Booking Link Not Working?
1. Check if you have a booking_link set in your profile
2. Go to Settings → Booking Page to generate one
3. Make sure the URL format is: `/book/{your-booking-link}`

### Services Not Showing?
1. Make sure you have services created in Services page
2. Check RLS policies allow public read access
3. Verify in SQL Editor:
   ```sql
   SELECT * FROM public.services WHERE user_id = 'your-user-id';
   ```

---

## 📞 Need Help?

Check the detailed error logs in:
- Browser Console (F12 → Console tab)
- `BOOKING_ERROR_HANDLING.md` for error code reference
- Supabase Dashboard → Logs

---

## ✨ Next Steps

After applying the fix:
1. ✅ Test booking flow thoroughly
2. ✅ Set up your brand colors in Brand Settings
3. ✅ Share your booking link with customers
4. ✅ Monitor the Agenda page for new bookings
