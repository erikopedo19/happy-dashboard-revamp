import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@heroui/react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const roleOptions = [
  {
    id: "barber" as const,
    label: "Sign in as a Barber",
    sublabel: "Manage and grow your chair",
    description: "Access the full suite of booking, scheduling and client tools.",
    icon: Scissors,
    variant: "barber"
  },
  {
    id: "client" as const,
    label: "Sign in as a Client",
    sublabel: "Find the right barber fast",
    description: "Discover barbers nearby, compare portfolios and secure your spot.",
    feature: "You get instant booking confirmations, favourites for quick re-booking and secure payment options.",
    icon: User,
    variant: "client"
  },
];

type RoleId = (typeof roleOptions)[number]["id"];

const ChooseRole = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.role) {
      navigate("/admin", { replace: true });
    }
  }, [navigate, user?.user_metadata?.role]);

  const handleConfirmRole = async (role: RoleId) => {
    if (!user) {
      toast({
        title: "You're not signed in",
        description: "Please sign in again and try choosing a role.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setSelectedRole(role);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { role: role },
      });

      if (authError) {
        throw authError;
      }

      toast({
        title: "Role updated",
        description: "Let's complete your profile to get started!",
      });

      // Redirect to profile completion
      navigate("/complete-profile", { replace: true });
    } catch (error) {
      console.error("Error saving role", error);
      toast({
        title: "Something went wrong",
        description: "We couldn't save your role. Please try again.",
        variant: "destructive",
      });
      setSelectedRole(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl flex overflow-hidden w-full max-w-6xl h-[700px] md:h-[650px] lg:h-[700px]">
        {/* Left Side - Content */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto">
            <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold tracking-wider rounded-md mb-4 uppercase">
                    Quick Sign-in
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                    Choose how you want to continue
                </h1>
                <p className="text-gray-500 text-base md:text-lg max-w-md">
                    Pick the option that fits your journey. We'll tailor the experience from there.
                </p>
            </div>

            <div className="flex-1 flex flex-col gap-5 justify-center">
                {/* Barber Card - Dark */}
                <div 
                    className={cn(
                        "group relative rounded-[24px] p-6 transition-all duration-300 cursor-pointer border-2",
                        selectedRole === 'barber' 
                            ? "bg-[#1a1b2e] border-[#1a1b2e] shadow-xl scale-[1.02]" 
                            : "bg-[#1a1b2e] border-[#1a1b2e] hover:shadow-lg hover:scale-[1.01] opacity-90 hover:opacity-100"
                    )}
                    onClick={() => handleConfirmRole('barber')}
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[16px] bg-white/10 flex items-center justify-center text-white shrink-0">
                            <Scissors className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Barber</span>
                            <h3 className="text-xl font-bold text-white mb-1">Sign in as a Barber</h3>
                            <p className="text-gray-400 text-sm mb-4">Manage and grow your chair</p>
                            <div className="w-full h-px bg-white/10 mb-4" />
                            <p className="text-gray-400 text-sm">Access the full suite of booking, scheduling and client tools.</p>
                        </div>
                    </div>
                    {selectedRole === 'barber' && isSaving && (
                        <div className="absolute inset-0 bg-[#1a1b2e]/50 backdrop-blur-[1px] rounded-[24px] flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-white animate-spin" />
                        </div>
                    )}
                </div>

                {/* Client Card - Light */}
                <div 
                    className={cn(
                        "group relative rounded-[24px] p-6 transition-all duration-300 cursor-pointer border-2",
                        selectedRole === 'client'
                            ? "bg-white border-rose-100 shadow-xl scale-[1.02] ring-2 ring-rose-500/10"
                            : "bg-white border-gray-100 hover:border-rose-100 hover:shadow-lg hover:scale-[1.01]"
                    )}
                    onClick={() => handleConfirmRole('client')}
                >
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-[16px] bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                            <User className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                             <span className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1 block">Client</span>
                             <h3 className="text-xl font-bold text-gray-900 mb-1">Sign in as a Client</h3>
                             <p className="text-gray-500 text-sm">Find the right barber fast</p>
                        </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 pl-16">
                        Discover barbers nearby, compare portfolios and secure your spot.
                    </p>

                    <div className="ml-16 bg-rose-50/50 rounded-xl p-4 border border-rose-100 mb-4">
                        <p className="text-xs text-rose-700/80 leading-relaxed">
                            You get instant booking confirmations, favourites for quick re-booking and secure payment options.
                        </p>
                    </div>

                    <div className="ml-16">
                        <Button
                            className="bg-[#9f1239] hover:bg-[#881337] text-white rounded-[14px] px-6 py-5 w-full md:w-auto font-semibold shadow-lg shadow-rose-900/10 transition-all hover:translate-y-[-1px]"
                            isDisabled={isSaving && selectedRole === 'client'}
                        >
                             {isSaving && selectedRole === 'client' ? "Setting up..." : "Continue as Client"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side - Image */}
        <div className="hidden lg:block w-1/2 h-full relative overflow-hidden bg-black">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <img 
                src="https://images.unsplash.com/photo-1503951914875-befbb647e84c?q=80&w=2070&auto=format&fit=crop" 
                alt="Barbershop atmosphere" 
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-[2s]"
            />
            <div className="absolute bottom-12 left-12 z-20 max-w-md">
                <span className="text-white/80 text-xs font-bold tracking-[0.2em] uppercase mb-4 block">Crafted for Pros</span>
                <h2 className="text-4xl font-bold text-white mb-4 leading-tight">Stay in sync with your chair</h2>
                <p className="text-white/70 text-lg leading-relaxed">
                    Whether you're managing a busy shop or booking your next cut, Cutzio keeps every step effortless.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChooseRole;
