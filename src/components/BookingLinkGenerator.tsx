import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Share2, 
  Save, 
  Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BookingLinkGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [askPhone, setAskPhone] = useState(true);
  const [askNotes, setAskNotes] = useState(true);
  const [bookingLocale, setBookingLocale] = useState<"en" | "el">("en");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile with booking link
  const { data: profile, refetch } = useQuery({
    queryKey: ['profile-booking-link', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('booking_link, full_name, ask_phone, ask_notes, brand_color, booking_locale')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              ask_phone: true, // Default to true for new profiles
              ask_notes: true,  // Default to true for new profiles
              brand_color: "#e11d48"
            })
            .select('booking_link, full_name, ask_phone, ask_notes, brand_color, booking_locale')
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
    setAskPhone(profile?.ask_phone ?? true);
    setAskNotes(profile?.ask_notes ?? true);
    setBookingLocale(profile?.booking_locale === "el" ? "el" : "en");
  }, [profile]);

  const getBookingUrl = () => {
    if (!profile?.booking_link) return '';
    const baseUrl = `${window.location.origin}/book/${profile.booking_link}`;
    const params = new URLSearchParams();
    if (askPhone) params.append('askPhone', 'true');
    if (askNotes) params.append('askNotes', 'true');
    params.append('lang', bookingLocale);
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
          booking_locale: bookingLocale,
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
      newSlug = profile.full_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!newSlug) {
        newSlug = 'book-' + Math.random().toString(36).substring(2, 15);
      }
    } else {
      newSlug = 'book-' + Math.random().toString(36).substring(2, 15);
    }
    setCustomSlug(newSlug);
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
    <div className="bg-[#0A0A0C] text-white">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        {/* Header */}
        <div className="text-center max-w-md mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/10 mb-4">
            <LinkIcon className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Booking link
          </h2>
          <p className="text-sm text-gray-400">
            Share one simple link so clients can book with you.
          </p>
        </div>

        {/* Link card */}
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-white/20 transition-all">
            <span className="text-sm text-gray-400 font-medium select-none">/book/</span>
            <input
              id="slug"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              placeholder="your-business-name"
              className="bg-transparent flex-1 text-sm font-medium text-white placeholder:text-gray-600 outline-none"
            />
            <button
              type="button"
              onClick={generateNewLink}
              className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>

          {/* Actions */}
          {bookingUrl && (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 h-11">
                <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-300 truncate select-all">
                  {bookingUrl.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <button
                onClick={copyToClipboard}
                className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Copy className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={shareLink}
                className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Share2 className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={openBookingPage}
                className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={updateSlug}
            disabled={isGenerating || customSlug.trim().length === 0}
            className="w-full h-12 rounded-2xl bg-white text-[#0A0A0C] font-semibold hover:bg-gray-100 transition-colors"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save booking link
          </Button>

          {/* Booking language */}
          <div className="border border-white/10 bg-white/5 rounded-2xl px-4 py-4">
            <Label htmlFor="bookingLocale" className="mb-2 block text-sm font-semibold text-gray-300">
              Booking page language
            </Label>
            <select
              id="bookingLocale"
              value={bookingLocale}
              onChange={(event) => setBookingLocale(event.target.value as "en" | "el")}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#151519] px-3 text-sm text-white outline-none"
            >
              <option value="en">English (default)</option>
              <option value="el">Greek (Ελληνικά)</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <Label htmlFor="askPhone" className="text-sm text-gray-300 cursor-pointer">
                Ask phone
              </Label>
              <Switch
                id="askPhone"
                checked={askPhone}
                onCheckedChange={(checked) => setAskPhone(checked as boolean)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <Label htmlFor="askNotes" className="text-sm text-gray-300 cursor-pointer">
                Ask notes
              </Label>
              <Switch
                id="askNotes"
                checked={askNotes}
                onCheckedChange={(checked) => setAskNotes(checked as boolean)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingLinkGenerator;
