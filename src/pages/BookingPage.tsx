
import { useAuth } from "@/contexts/AuthContext";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import BookingFormPreview from "@/components/BookingFormPreview";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const BookingPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
          <h2 className="text-2xl font-semibold text-[#1C1C1E] mb-3">Authentication Required</h2>
          <p className="text-[#8E8E93]">Please log in to access your booking page settings.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-white">
        <AppSidebar />
        <main className="flex-1 bg-[#F2F2F7]">
          <div className="p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6 lg:mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold text-[#1C1C1E] mb-2">Booking Page</h1>
                <p className="text-[#8E8E93] text-lg">
                  Manage your booking page and share your booking link with customers.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <BookingLinkGenerator />
                  
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-[#1C1C1E] mb-6">How it works</h2>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm flex-shrink-0">
                          1
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1C1C1E] mb-1">Generate your booking link</h3>
                          <p className="text-[#8E8E93] text-sm leading-relaxed">Click the button above to create a unique booking link for your business.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm flex-shrink-0">
                          2
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1C1C1E] mb-1">Share with customers</h3>
                          <p className="text-[#8E8E93] text-sm leading-relaxed">Copy and share your link via social media, email, or your website.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm flex-shrink-0">
                          3
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1C1C1E] mb-1">Receive bookings</h3>
                          <p className="text-[#8E8E93] text-sm leading-relaxed">Customers can book appointments directly, and they'll appear in your agenda.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-[#1C1C1E] mb-3">Form Preview</h2>
                    <p className="text-[#8E8E93] mb-6">
                      This is how your booking form will appear to customers
                    </p>
                    <BookingFormPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BookingPage;
