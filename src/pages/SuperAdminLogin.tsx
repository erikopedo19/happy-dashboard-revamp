import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, Shield } from "lucide-react";

const SUPER_ADMIN_EMAIL = "erikballiu19@gmail.com";

const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
      toast.error("Access denied. Only the super admin can log in here.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back, Super Admin!");
        navigate("/superadmin/dashboard");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e11d48]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <Shield className="w-8 h-8 text-[#e11d48]" />
          </div>
          <h1 className="text-2xl font-bold font-sora mb-1">Super Admin</h1>
          <p className="text-sm text-muted-foreground">
            Restricted access — authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e11d48]/50 focus:border-[#e11d48]/50 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e11d48]/50 focus:border-[#e11d48]/50 transition-all"
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
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to homepage
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
