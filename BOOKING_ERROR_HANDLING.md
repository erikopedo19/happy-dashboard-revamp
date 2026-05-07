# Booking System Error Handling

This document explains the comprehensive error handling system implemented for the public booking flow.

## Overview

The booking system now includes detailed error tracking and user-friendly error messages to help diagnose and resolve issues quickly.

## Error Types

### 1. **MISSING_BOOKING_LINK**
- **When**: URL doesn't contain a booking link parameter
- **User Message**: "No booking link provided"
- **Details**: "The URL is missing the booking link parameter"
- **Action**: Check the URL format should be `/book/{bookingLink}`

### 2. **RPC_ERROR**
- **When**: Database RPC function fails
- **User Message**: "Failed to fetch business profile"
- **Details**: Database error message
- **Action**: Check database connection and RPC function exists

### 3. **PROFILE_NOT_FOUND**
- **When**: No business profile exists for the booking link
- **User Message**: "Business profile not found"
- **Details**: Shows the booking link that was searched
- **Action**: Verify the booking link is correct and the business profile exists

### 4. **SERVICES_FETCH_ERROR**
- **When**: Cannot load services from database
- **User Message**: "Failed to load services"
- **Details**: Database error message
- **Action**: Check RLS policies and database permissions

### 5. **NO_SERVICES**
- **When**: Business has no services configured
- **User Message**: "No services available"
- **Details**: "This business has not set up any services yet"
- **Action**: Business owner needs to add services in their dashboard

### 6. **INCOMPLETE_BOOKING**
- **When**: User tries to submit without selecting date/time
- **User Message**: "Incomplete booking information"
- **Details**: "Please select a date and time before confirming"
- **Action**: User must complete all required fields

### 7. **CUSTOMER_CREATE_ERROR**
- **When**: Cannot create customer record in database
- **User Message**: "Failed to create customer record"
- **Details**: Database error message
- **Action**: Check RLS policies for customers table

### 8. **APPOINTMENT_CREATE_ERROR**
- **When**: Cannot create appointment in database
- **User Message**: "Failed to create appointment"
- **Details**: "Could not schedule the appointment. The time slot may no longer be available."
- **Action**: Time slot may be taken, try another time

### 9. **UNKNOWN_ERROR**
- **When**: Unexpected error occurs
- **User Message**: "Booking failed"
- **Details**: Generic error message
- **Action**: Check console logs for more details

## Error Display

### Error Page Features
- **Visual Indicator**: Color-coded icon (red for errors, yellow for warnings)
- **Clear Title**: User-friendly error message
- **Detailed Description**: Helpful explanation of what went wrong
- **Error Details Panel**: Shows error code and booking link for debugging
- **Action Buttons**: 
  - "Try Again" - Reloads the page
  - "Go Back" - Returns to previous page

### Console Logging
All errors are logged to the browser console with:
- Error code
- Error message
- Full error details
- Context (booking link, user actions, etc.)

## Database Migration

The system includes a migration (`20251207170500_fix_booking_rpc.sql`) that:
1. Adds `primary_color` column to `brand_profiles` table (if not exists)
2. Updates RPC function to return `brand_color` field
3. Provides fallback color `#e0c4a8` if no brand color is set

## Testing Checklist

- [ ] Test with invalid booking link
- [ ] Test with non-existent booking link
- [ ] Test with business that has no services
- [ ] Test with business that has no brand profile
- [ ] Test appointment creation with invalid data
- [ ] Test appointment creation when time slot is taken
- [ ] Verify error messages are user-friendly
- [ ] Verify error details are logged to console
- [ ] Test "Try Again" button functionality
- [ ] Test "Go Back" button functionality

## Developer Notes

### Adding New Error Types

1. Add error code to `BookingError` interface
2. Create error object with code, message, and details
3. Throw or set the error at the appropriate location
4. Update this documentation

### Error Handling Pattern

```typescript
try {
  // Operation that might fail
  const result = await someOperation();
  
  if (error) {
    const bookingError: BookingError = {
      code: 'ERROR_CODE',
      message: 'User-friendly message',
      details: 'Technical details for debugging'
    };
    setBookingError(bookingError);
    throw bookingError;
  }
} catch (error: any) {
  console.error('Operation failed:', error);
  toast({
    title: error.message,
    description: error.details,
    variant: "destructive",
  });
}
```

## Future Improvements

- [ ] Add error tracking/monitoring service integration
- [ ] Add retry logic for transient errors
- [ ] Add offline detection and messaging
- [ ] Add rate limiting error handling
- [ ] Add validation error messages for form fields
- [ ] Add email notification for critical errors
