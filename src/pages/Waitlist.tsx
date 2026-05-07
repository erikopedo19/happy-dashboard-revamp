import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Scissors,
  BarChart3,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Mail,
  MessageSquare,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const SLIDES = [
  {
    icon: Scissors,
    title: "Smart Booking System",
    description:
      "Let your clients book appointments 24/7 with an intelligent scheduling system that prevents double-bookings and optimizes your day.",
    gradient: "from-violet-500/20 to-fuchsia-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Build lasting relationships with a complete client database — track preferences, visit history, and notes all in one place.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Calendar,
    title: "Agenda & Calendar",
    description:
      "A beautiful, intuitive calendar designed for barbers. Drag & drop appointments, manage breaks, and see your day at a glance.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Understand your business with detailed reports — revenue tracking, peak hours, popular services, and client retention metrics.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Sparkles,
    title: "Brand Customization",
    description:
      "Make it yours. Custom booking pages, brand colors, and a personalized experience that reflects your unique style.",
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-400",
  },
];

const Waitlist: React.FC = () => {
  const [email, setEmail] = useState("");
  const [wishlist, setWishlist] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentSlide(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Auto-scroll
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist" as any).insert([
        {
          email: email.trim().toLowerCase(),
          wishlist: wishlist.trim() || null,
        },
      ] as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("This email is already on the waitlist!");
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast.success("You're on the list! We'll be in touch soon.");
      }
    } catch (err: any) {
      console.error("Waitlist error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-center pt-8 pb-4 px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <img src="/logo.svg" alt="Cutzio" className="h-10 w-10" />
            <span className="text-2xl font-bold tracking-tight font-sora">
              Cutzio
            </span>
          </motion.div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-muted-foreground mb-6">
              <Clock className="w-3.5 h-3.5" />
              Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-sora mb-4 leading-[1.1]">
              The future of
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                barbershop management
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to run your barbershop — bookings, clients,
              analytics, and your brand — all in one beautiful app.
            </p>
          </motion.div>

          {/* Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full max-w-2xl mb-12"
          >
            <div className="relative">
              <div ref={emblaRef} className="overflow-hidden rounded-2xl">
                <div className="flex">
                  {SLIDES.map((slide, index) => (
                    <div
                      key={index}
                      className="flex-[0_0_100%] min-w-0 px-2"
                    >
                      <div
                        className={`bg-gradient-to-br ${slide.gradient} border border-white/10 rounded-2xl p-8 sm:p-10 backdrop-blur-sm`}
                      >
                        <div
                          className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 ${slide.iconColor} mb-5`}
                        >
                          <slide.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 font-sora">
                          {slide.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {slide.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel Navigation */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={scrollPrev}
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                  {SLIDES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => emblaApi?.scrollTo(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentSlide === index
                          ? "w-8 bg-white"
                          : "w-2 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={scrollNext}
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="w-full max-w-md"
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 font-sora">
                    You're on the list!
                  </h3>
                  <p className="text-muted-foreground">
                    We'll notify you as soon as Cutzio is ready. Stay tuned!
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold font-sora mb-1">
                      Join the Waitlist
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Be the first to know when we launch
                    </p>
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      required
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                    <textarea
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                      placeholder="What features would you love to see? (optional)"
                      rows={3}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        Join Waitlist
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Cutzio. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Waitlist;
