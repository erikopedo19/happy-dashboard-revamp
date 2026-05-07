
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import BookingFormPreview from "@/components/BookingFormPreview";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const BookingPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access your booking page settings.</p>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-white">
        <AppSidebar />
        <main className="flex-1 bg-gray-50">
          <div className="p-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Page</h1>
                <p className="text-gray-600">
                  Manage your booking page and share your booking link with customers.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <BookingLinkGenerator />
                  
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">How it works</h2>
                    <div className="space-y-4 text-gray-600">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                          1
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Generate your booking link</h3>
                          <p className="text-sm">Click the button above to create a unique booking link for your business.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                          2
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Share with customers</h3>
                          <p className="text-sm">Copy and share your link via social media, email, or your website.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                          3
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Receive bookings</h3>
                          <p className="text-sm">Customers can book appointments directly, and they'll appear in your agenda.</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Form Preview</h2>
                    <p className="text-gray-600 mb-6">
                      This is how your booking form will appear to customers
                    </p>
                    <BookingFormPreview />
                  </Card>
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
