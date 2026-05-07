import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, ExternalLink, RefreshCw, Share2, Save, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BookingLinkGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [askPhone, setAskPhone] = useState(true);
  const [askNotes, setAskNotes] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [emailTheme, setEmailTheme] = useState<"default" | "minimal" | "festive">("default");
  const [accentColor, setAccentColor] = useState("#1a1a1a");

  // Fetch user profile with booking link
  const { data: profile, refetch } = useQuery({
    queryKey: ['profile-booking-link', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('booking_link, full_name, ask_phone, ask_notes, brand_color')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              ask_phone: true, // Default to true for new profiles
              ask_notes: true,  // Default to true for new profiles
              brand_color: "#1a1a1a"
            })
            .select('booking_link, full_name, ask_phone, ask_notes, brand_color')
            .single();

          if (createError) throw createError;
          return newProfile;
        }
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.booking_link) {
      setCustomSlug(profile.booking_link);
    }
    // Set askPhone and askNotes from profile, default to true if not present
    setAskPhone(profile?.ask_phone ?? true);
    setAskNotes(profile?.ask_notes ?? true);
    setAccentColor(profile?.brand_color ?? "#1a1a1a");
    // We don't persist theme server-side yet; keep default unless user changes locally
  }, [profile]);

  const getBookingUrl = () => {
    if (!profile?.booking_link) return '';
    const baseUrl = `${window.location.origin}/book/${profile.booking_link}`;
    const params = new URLSearchParams();
    if (askPhone) params.append('askPhone', 'true');
    if (askNotes) params.append('askNotes', 'true');
    if (emailTheme) params.append('theme', emailTheme);
    if (accentColor) params.append('accent', accentColor);
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const bookingUrl = getBookingUrl();

  const updateSlug = async () => {
    if (!user || !customSlug.trim()) return;

    setIsGenerating(true);
    try {
      // Check if slug is taken by another user
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('booking_link', customSlug.trim())
        .neq('id', user.id) // Exclude current user
        .single();

      if (existingProfile) {
        toast({
          title: "Slug unavailable",
          description: "This booking link is already taken. Please choose another one.",
          variant: "destructive"
        });
        return;
      }
      // If no existing profile with this slug (or it's the current user's), proceed to update
      const { error } = await supabase
        .from('profiles')
        .update({
          booking_link: customSlug.trim(),
          ask_phone: askPhone,
          ask_notes: askNotes,
          brand_color: accentColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile-booking-link'] });
      await refetch();

      toast({
        title: "Success!",
        description: "Your booking link has been updated.",
      });
    } catch (error) {
      console.error('Error updating booking link:', error);
      toast({
        title: "Error",
        description: "Failed to update booking link. This slug might be taken.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNewLink = () => {
    let newSlug = '';
    if (profile?.full_name) {
      // Sanitize business name: lowercase, replace spaces/symbols with hyphens, remove non-alphanumeric
      newSlug = profile.full_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Add a random suffix if it's too short or to ensure uniqueness (optional, but good practice)
      // For now, let's just use the name as requested, maybe with a small random suffix if desired, 
      // but the user asked for "business name". Let's try just the name first, user can edit.
      if (!newSlug) {
        newSlug = 'book-' + Math.random().toString(36).substring(2, 15);
      }
    } else {
      newSlug = 'book-' + Math.random().toString(36).substring(2, 15);
    }
    setCustomSlug(newSlug);
    // We don't auto-save here, let user click save
  };

  const copyToClipboard = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({
        title: "Copied!",
        description: "Booking link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  const shareLink = async () => {
    if (!bookingUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Book an Appointment',
          text: `Book an appointment with ${profile?.full_name || 'us'} `,
          url: bookingUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      copyToClipboard();
    }
  };

  const openBookingPage = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Booking Link</h3>
          <p className="text-sm text-gray-600">
            Customize and share your booking link with customers
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Link Slug</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                  {window.location.origin}/book/
                </span>
                <Input
                  id="slug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="your-business-name"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={updateSlug}
                disabled={
                  isGenerating ||
                  (
                    customSlug === profile?.booking_link &&
                    askPhone === (profile?.ask_phone ?? true) &&
                    askNotes === (profile?.ask_notes ?? true) &&
                    accentColor === (profile?.brand_color ?? "#1a1a1a")
                  )
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="sr-only sm:not-sr-only sm:ml-2">Save</span>
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateNewLink}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Generate Random Slug
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only use letters, numbers, and hyphens.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Form Configuration</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="askPhone"
                  checked={askPhone}
                  onCheckedChange={(checked) => setAskPhone(checked as boolean)}
                />
                <Label htmlFor="askPhone" className="font-normal cursor-pointer">Ask for Phone Number</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="askNotes"
                  checked={askNotes}
                  onCheckedChange={(checked) => setAskNotes(checked as boolean)}
                />
                <Label htmlFor="askNotes" className="font-normal cursor-pointer">Ask for Notes</Label>
              </div>
              <div className="grid gap-2">
                <Label>Email Template</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: "default", label: "Default" },
                    { value: "minimal", label: "Minimal" },
                    { value: "festive", label: "Festive" },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      variant={emailTheme === opt.value ? "default" : "outline"}
                      className="w-full justify-between"
                      onClick={() => setEmailTheme(opt.value as typeof emailTheme)}
                      type="button"
                    >
                      {opt.label}
                      {emailTheme === opt.value && <Check className="w-4 h-4" />}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-16 rounded border border-input bg-background cursor-pointer"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for email header buttons and accents. Shared in the link so the public booking page can apply it.
                </p>
              </div>
            </div>
          </div>

          {bookingUrl && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyToClipboard}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={shareLink}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openBookingPage}
                title="Open booking page"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BookingLinkGenerator;
