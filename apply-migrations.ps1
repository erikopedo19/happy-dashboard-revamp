# PowerShell script to apply Supabase migrations
# This will apply the new migrations to fix the booking issues

Write-Host "Applying Supabase migrations..." -ForegroundColor Cyan

# Check if Supabase CLI is installed
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseCli) {
    Write-Host "Using Supabase CLI to apply migrations..." -ForegroundColor Green
    
    # Link to project if not already linked
    Write-Host "Linking to Supabase project..." -ForegroundColor Yellow
    supabase link --project-ref idcifrhzlmxcdihzdtmn
    
    # Apply migrations
    Write-Host "Pushing database changes..." -ForegroundColor Yellow
    supabase db push
    
    Write-Host "Migrations applied successfully!" -ForegroundColor Green
} else {
    Write-Host "Supabase CLI not found. Please apply migrations manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/idcifrhzlmxcdihzdtmn" -ForegroundColor White
    Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
    Write-Host "3. Run these migrations in order:" -ForegroundColor White
    Write-Host "   - supabase/migrations/20251207170500_fix_booking_rpc.sql" -ForegroundColor Cyan
    Write-Host "   - supabase/migrations/20251207190300_fix_appointment_unique_constraint.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or install Supabase CLI: npm install -g supabase" -ForegroundColor Yellow
}
