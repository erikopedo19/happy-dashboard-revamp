import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Shield,
  LogOut,
  Mail,
  MessageSquare,
  Users,
  Clock,
  Download,
  RefreshCw,
  Search,
  Loader2,
} from "lucide-react";

const SUPER_ADMIN_EMAIL = "erikballiu19@gmail.com";

interface WaitlistEntry {
  id: string;
  email: string;
  wishlist: string | null;
  created_at: string;
}

const SuperAdminDashboard: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.email !== SUPER_ADMIN_EMAIL)) {
      navigate("/superadmin", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("waitlist" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries((data as any) || []);
    } catch (err: any) {
      console.error("Error fetching waitlist:", err);
      toast.error("Failed to load waitlist entries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.email === SUPER_ADMIN_EMAIL) {
      fetchEntries();
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/superadmin", { replace: true });
  };

  const handleExportCSV = () => {
    const headers = ["Email", "Wishlist", "Signed Up"];
    const rows = filteredEntries.map((entry) => [
      entry.email,
      entry.wishlist || "",
      new Date(entry.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cutzio-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.wishlist && entry.wishlist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E]">
      {/* Header */}
      <header className="border-b border-[#C6C6C8] bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF3B30]/10">
              <Shield className="w-5 h-5 text-[#FF3B30]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1C1C1E]">Super Admin</h1>
              <p className="text-xs text-[#8E8E93]">Waitlist Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#C6C6C8] text-sm text-[#1C1C1E] hover:bg-[#E5E5EA] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="rounded-2xl bg-white shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-[#5856D6]" />
              <span className="text-sm text-[#8E8E93] font-medium uppercase tracking-wide">Total Signups</span>
            </div>
            <p className="text-3xl font-bold text-[#1C1C1E]">{entries.length}</p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-[#007AFF]" />
              <span className="text-sm text-[#8E8E93] font-medium uppercase tracking-wide">With Wishes</span>
            </div>
            <p className="text-3xl font-bold text-[#1C1C1E]">
              {entries.filter((e) => e.wishlist).length}
            </p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-[#34C759]" />
              <span className="text-sm text-[#8E8E93] font-medium uppercase tracking-wide">Latest Signup</span>
            </div>
            <p className="text-lg font-semibold text-[#1C1C1E]">
              {entries.length > 0
                ? new Date(entries[0].created_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or wishlist..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-[#C6C6C8] text-sm text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-[#C6C6C8] text-sm text-[#1C1C1E] hover:bg-[#F2F2F7] transition-all disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007AFF] text-white text-sm font-medium hover:bg-[#0062CC] transition-all disabled:opacity-50 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-[#C6C6C8] bg-white shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#8E8E93]" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-20 text-[#8E8E93]">
              <Mail className="w-10 h-10 mx-auto mb-3 text-[#C6C6C8]" />
              <p className="text-sm">
                {searchQuery ? "No results found" : "No waitlist entries yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F2F2F7] bg-[#F9F9F9]">
                    <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-6 py-4">
                      #
                    </th>
                    <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-6 py-4">
                      Email
                    </th>
                    <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-6 py-4">
                      Wishlist
                    </th>
                    <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-6 py-4">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[#F2F2F7] hover:bg-[#F2F2F7]/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-[#8E8E93]">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                          <span className="text-sm font-medium text-[#1C1C1E]">{entry.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {entry.wishlist ? (
                          <p className="text-sm text-[#1C1C1E] max-w-xs truncate">
                            {entry.wishlist}
                          </p>
                        ) : (
                          <span className="text-xs text-[#8E8E93]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#8E8E93] whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
