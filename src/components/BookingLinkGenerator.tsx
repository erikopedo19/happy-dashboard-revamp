import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Share2, 
  Save, 
  Check, 
  Mail, 
  QrCode, 
  Download,
  Settings,
  Sparkles,
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
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [emailTheme, setEmailTheme] = useState<"default" | "minimal" | "christmas" | "summer">("default");
  const [accentColor, setAccentColor] = useState("#e11d48");
  const [showQrCode, setShowQrCode] = useState(false);

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
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              ask_phone: true, // Default to true for new profiles
              ask_notes: true,  // Default to true for new profiles
              brand_color: "#e11d48"
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
    setAskPhone(profile?.ask_phone ?? true);
    setAskNotes(profile?.ask_notes ?? true);
    setAccentColor(profile?.brand_color ?? "#e11d48");
  }, [profile]);

  const getBookingUrl = () => {
    if (!profile?.booking_link) return '';
    const baseUrl = `${window.location.origin}/book/${profile.booking_link}`;
    const params = new URLSearchParams();
    if (askPhone) params.append('askPhone', 'true');
    if (askNotes) params.append('askNotes', 'true');
    if (emailTheme) params.append('theme', emailTheme);
    if (accentColor) params.append('accent', accentColor.replace('#', ''));
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const bookingUrl = getBookingUrl();

  // QR Code URL using QuickChart QR API with custom color
  const qrCodeUrl = bookingUrl 
    ? `https://quickchart.io/qr?text=${encodeURIComponent(bookingUrl)}&size=300&dark=${accentColor.replace('#', '')}&light=ffffff&ecLevel=H&margin=2`
    : '';

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

  const downloadQrCode = async () => {
    if (!qrCodeUrl) return;
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-qr-${customSlug || 'code'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Downloaded!",
        description: "Your custom QR code has been saved.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the QR code image.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Settings Panel */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LinkIcon className="h-5 w-5 text-[#e11d48]" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booking Link Config</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Customize and optimize your public booking form and experience.
          </p>
        </div>

        <div className="space-y-5">
          {/* Slug Input */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Link Slug</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-gray-50 dark:bg-zinc-900/60 rounded-xl px-3 border border-gray-200 dark:border-zinc-800 focus-within:border-[#e11d48] dark:focus-within:border-[#e11d48] focus-within:ring-1 focus-within:ring-[#e11d48]/20 transition-all">
                <span className="text-sm text-gray-400 font-mono hidden sm:inline-block border-r border-gray-200 dark:border-zinc-800 pr-2.5 mr-2.5 select-none">
                  /book/
                </span>
                <input
                  id="slug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="your-business-name"
                  className="bg-transparent font-mono text-sm h-11 w-full text-gray-800 dark:text-gray-100 outline-none"
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
                    accentColor === (profile?.brand_color ?? "#e11d48")
                  )
                }
                className="bg-[#e11d48] hover:bg-[#be123c] text-white h-11 px-5 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save</span>
              </Button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={generateNewLink}
                className="text-xs font-medium text-gray-400 hover:text-[#e11d48] flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Auto-generate from business name
              </button>
            </div>
          </div>

          {/* Form Configuration */}
          <div className="space-y-3 pt-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Required Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/80 p-3.5 rounded-xl hover:bg-gray-100/50 dark:hover:bg-zinc-900/60 transition-colors">
                <Checkbox
                  id="askPhone"
                  checked={askPhone}
                  onCheckedChange={(checked) => setAskPhone(checked as boolean)}
                  className="rounded-md border-gray-300 dark:border-zinc-700 data-[state=checked]:bg-[#e11d48] data-[state=checked]:border-[#e11d48]"
                />
                <Label htmlFor="askPhone" className="font-semibold text-sm cursor-pointer text-gray-700 dark:text-gray-300">Phone Number</Label>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/80 p-3.5 rounded-xl hover:bg-gray-100/50 dark:hover:bg-zinc-900/60 transition-colors">
                <Checkbox
                  id="askNotes"
                  checked={askNotes}
                  onCheckedChange={(checked) => setAskNotes(checked as boolean)}
                  className="rounded-md border-gray-300 dark:border-zinc-700 data-[state=checked]:bg-[#e11d48] data-[state=checked]:border-[#e11d48]"
                />
                <Label htmlFor="askNotes" className="font-semibold text-sm cursor-pointer text-gray-700 dark:text-gray-300">Extra Notes</Label>
              </div>
            </div>
          </div>

          {/* Color & Theme */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Accent Branding</Label>
                <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/80 p-2.5 rounded-xl">
                  <input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-12 rounded-lg border border-gray-200 dark:border-zinc-800 bg-background cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="bg-transparent font-mono text-xs w-full text-gray-700 dark:text-gray-300 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" /> Email Theme</Label>
                <div className="relative">
                  <select
                    value={emailTheme}
                    onChange={(e) => setEmailTheme(e.target.value as any)}
                    className="w-full h-[46px] px-3 bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/80 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-[#e11d48] transition-all appearance-none cursor-pointer"
                  >
                    <option value="default">✉️ Classic Rose</option>
                    <option value="minimal">🪶 Slate Minimalist</option>
                    <option value="christmas">🎄 Festive Winter</option>
                    <option value="summer">☀️ Sunny Vibes</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <Settings className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sharing & QR Code Live Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-gray-50/50 dark:bg-zinc-900/20 border border-gray-100 dark:border-zinc-800/50 rounded-2xl p-5 lg:p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#e11d48]" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Live Preview & Share</h4>
          </div>

          {bookingUrl ? (
            <div className="space-y-5">
              {/* QR Code Container */}
              <div className="flex flex-col items-center bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                {qrCodeUrl ? (
                  <div className="relative group overflow-hidden rounded-xl border border-gray-100 dark:border-zinc-900 p-2 bg-white">
                    <img 
                      src={qrCodeUrl} 
                      alt="Booking QR Code" 
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-gray-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-gray-400 animate-pulse" />
                  </div>
                )}
                <div className="text-center mt-3">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Interactive QR Code</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Scans instantly to open your booking form</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-9 rounded-xl border-gray-200 dark:border-zinc-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-zinc-900"
                  onClick={downloadQrCode}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download QR Code
                </Button>
              </div>

              {/* URL Preview */}
              <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between overflow-hidden shadow-sm">
                <span className="truncate mr-3 select-all">{bookingUrl}</span>
                <button 
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-[#e11d48] transition-colors shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <QrCode className="h-12 w-12 text-gray-300 dark:text-zinc-800 mb-3" />
              <p className="text-sm font-semibold text-gray-500">Save a slug to see live QR Code & link</p>
            </div>
          )}
        </div>

        {bookingUrl && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/60 font-semibold text-sm flex items-center justify-center gap-2"
              onClick={copyToClipboard}
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/60 font-semibold text-sm flex items-center justify-center gap-2"
              onClick={shareLink}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              variant="outline"
              className="h-11 w-11 rounded-xl border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/60 flex items-center justify-center shrink-0"
              onClick={openBookingPage}
              title="Open booking page"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingLinkGenerator;
