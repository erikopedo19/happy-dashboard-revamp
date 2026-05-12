import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Users, 
  Briefcase, 
  Star, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  // Business Info
  businessName: string;
  businessType: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Professional Info (for barbers)
  yearsOfExperience: string;
  previousWorkplaces: string;
  specialties: string[];
  certifications: string;
  averageClientsPerDay: string;
  
  // Marketing
  hearAboutUs: string;
  goals: string[];
  
  // Profile completion
  isComplete: boolean;
}

const specialtyOptions = [
  "Men's Haircuts",
  "Women's Haircuts",
  "Beard Trimming",
  "Hair Coloring",
  "Hair Styling",
  "Fade Cuts",
  "Shaving",
  "Hair Treatment",
  "Kids Haircuts",
  "Braiding"
];

const hearAboutUsOptions = [
  "Google Search",
  "Social Media (Instagram, Facebook, TikTok)",
  "Friend or Family Recommendation",
  "Online Advertisement",
  "YouTube",
  "Industry Event or Conference",
  "App Store",
  "Other"
];

const goalOptions = [
  "Increase bookings",
  "Manage my schedule better",
  "Grow my client base",
  "Accept online payments",
  "Build my brand",
  "Manage my team"
];

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProfileData>({
    businessName: "",
    businessType: "barbershop",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    yearsOfExperience: "",
    previousWorkplaces: "",
    specialties: [],
    certifications: "",
    averageClientsPerDay: "",
    hearAboutUs: "",
    goals: [],
    isComplete: false
  });

  useEffect(() => {
    const userRole = user?.user_metadata?.role;
    setRole(userRole);
    
    // If no role, redirect to choose role
    if (!userRole) {
      navigate("/choose-role", { replace: true });
      return;
    }
    
    // Check if profile is already complete
    checkProfileCompletion();
  }, [user, navigate]);

  const checkProfileCompletion = async () => {
    if (!user) return;
    
    // Check if onboarding_completed column exists and is true
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  };

  const totalSteps = role === "barber" ? 4 : 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleInputChange = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.businessName || !formData.phoneNumber) {
          toast.error("Please fill in all required fields");
          return false;
        }
        return true;
      case 2:
        if (role === "barber" && (!formData.yearsOfExperience || formData.specialties.length === 0)) {
          toast.error("Please complete your professional information");
          return false;
        }
        return true;
      case 3:
        if (!formData.hearAboutUs) {
          toast.error("Please let us know how you heard about us");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Update profiles table with onboarding_completed = true
      // We use RPC or just direct update if column exists. 
      // If column doesn't exist, this might error, but we provided SQL to fix it.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.businessName,
          phone: formData.phoneNumber,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        } as any) // Type assertion until types are generated
        .eq("id", user.id);

      if (profileError) {
        // Fallback if column doesn't exist - try updating without the column
        console.warn("Could not update onboarding_completed, trying without it", profileError);
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.businessName,
            phone: formData.phoneNumber,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);
          
        if (fallbackError) throw fallbackError;
      }

      // If barber, create/update stylist profile
      if (role === "barber") {
        const { error: stylistError } = await supabase
          .from("stylists")
          .upsert({
            user_id: user.id,
            name: formData.businessName,
            title: "Barber",
            specialties: formData.specialties,
            status: "available",
            is_public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: "user_id"
          });

        if (stylistError) throw stylistError;

        // brand_profiles table not available — skipping brand profile sync
      }

      toast.success("Profile completed successfully!", {
        description: "Welcome to Cutzio! Let's get started."
      });

      navigate("/admin", { replace: true });
    } catch (error) {
      console.error("Error completing profile:", error);
      toast.error("Failed to complete profile", {
        description: "Please try again or contact support."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Business Information</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Let's start with the basics about your business
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-medium">
                  Business Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Elite Cuts Barbershop"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType" className="text-sm font-medium">
                  Business Type
                </Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => handleInputChange("businessType", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barbershop">Barbershop</SelectItem>
                    <SelectItem value="salon">Hair Salon</SelectItem>
                    <SelectItem value="spa">Spa & Salon</SelectItem>
                    <SelectItem value="mobile">Mobile Service</SelectItem>
                    <SelectItem value="independent">Independent Stylist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  Street Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">City</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium">State</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium">ZIP Code</Label>
                <Input
                  id="zipCode"
                  placeholder="10001"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        if (role === "barber") {
          return (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Briefcase className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Professional Background</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tell us about your experience and expertise
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience" className="text-sm font-medium">
                    Years of Experience <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.yearsOfExperience}
                    onValueChange={(value) => handleInputChange("yearsOfExperience", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-10">5-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previousWorkplaces" className="text-sm font-medium">
                    Previous Workplaces
                  </Label>
                  <Textarea
                    id="previousWorkplaces"
                    placeholder="e.g., Master Cuts (2018-2020), Elite Salon (2020-2023)"
                    value={formData.previousWorkplaces}
                    onChange={(e) => handleInputChange("previousWorkplaces", e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    List your previous employers or businesses you've worked with
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Specialties <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {specialtyOptions.map((specialty) => (
                      <div
                        key={specialty}
                        className={cn(
                          "flex items-center space-x-2 rounded-lg border-2 p-3 cursor-pointer transition-all hover:border-primary/50",
                          formData.specialties.includes(specialty)
                            ? "border-primary bg-primary/5"
                            : "border-gray-200"
                        )}
                        onClick={() => handleSpecialtyToggle(specialty)}
                      >
                        <Checkbox
                          id={specialty}
                          checked={formData.specialties.includes(specialty)}
                          onCheckedChange={() => handleSpecialtyToggle(specialty)}
                        />
                        <label
                          htmlFor={specialty}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {specialty}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications" className="text-sm font-medium">
                    Certifications & Training
                  </Label>
                  <Textarea
                    id="certifications"
                    placeholder="e.g., State Barber License, Advanced Fade Techniques Certification"
                    value={formData.certifications}
                    onChange={(e) => handleInputChange("certifications", e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="averageClientsPerDay" className="text-sm font-medium">
                    Average Clients Per Day
                  </Label>
                  <Select
                    value={formData.averageClientsPerDay}
                    onValueChange={(value) => handleInputChange("averageClientsPerDay", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 clients</SelectItem>
                      <SelectItem value="6-10">6-10 clients</SelectItem>
                      <SelectItem value="11-15">11-15 clients</SelectItem>
                      <SelectItem value="16-20">16-20 clients</SelectItem>
                      <SelectItem value="20+">20+ clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        }
        // For clients, skip to step 3
        return renderStepContent();

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Help Us Serve You Better</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                We'd love to know more about your goals and how you found us
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  How did you hear about us? <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={formData.hearAboutUs}
                  onValueChange={(value) => handleInputChange("hearAboutUs", value)}
                  className="space-y-2"
                >
                  {hearAboutUsOptions.map((option) => (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all hover:border-primary/50",
                        formData.hearAboutUs === option
                          ? "border-primary bg-primary/5"
                          : "border-gray-200"
                      )}
                      onClick={() => handleInputChange("hearAboutUs", option)}
                    >
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="cursor-pointer flex-1 text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {role === "barber" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    What are your main goals? (Select all that apply)
                  </Label>
                  <div className="space-y-2">
                    {goalOptions.map((goal) => (
                      <div
                        key={goal}
                        className={cn(
                          "flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all hover:border-primary/50",
                          formData.goals.includes(goal)
                            ? "border-primary bg-primary/5"
                            : "border-gray-200"
                        )}
                        onClick={() => handleGoalToggle(goal)}
                      >
                        <Checkbox
                          id={goal}
                          checked={formData.goals.includes(goal)}
                          onCheckedChange={() => handleGoalToggle(goal)}
                        />
                        <label
                          htmlFor={goal}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {goal}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground max-w-md">
                  Your profile is ready. Click finish to start using Cutzio and grow your business.
                </p>
              </div>
            </div>

            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Name:</span>
                  <span className="font-medium">{formData.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Type:</span>
                  <span className="font-medium capitalize">{formData.businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{formData.phoneNumber}</span>
                </div>
                {role === "barber" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Experience:</span>
                      <span className="font-medium">{formData.yearsOfExperience} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Specialties:</span>
                      <span className="font-medium">{formData.specialties.length} selected</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <CardDescription>
                Just a few more details to get you started
              </CardDescription>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>

          <CardContent className="space-y-6">
            {renderStepContent()}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={handleNext} className="btn-gradient-rose">
                  <span>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-gradient-rose">
                  <span>
                    {isSubmitting ? "Finishing..." : "Finish"}
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;
