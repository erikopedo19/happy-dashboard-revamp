import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Phone, Mail, MessageSquare } from "lucide-react";

const BookingFormPreview = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Cal.com Dark Theme Preview */}
      <div className="flex min-h-[600px] bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Panel - Service Info */}
        <div className="w-[320px] bg-[#1a1a1a] p-8 flex flex-col border-r border-[#2a2a2a]">
          {/* Profile */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=barber`}
                alt="Business"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-3 text-sm text-gray-400">BarberPro</p>
          </div>

          {/* Service Title */}
          <h2 className="text-xl font-semibold text-white mb-2">
            [60-min] Premium Haircut
          </h2>

          <p className="text-sm text-gray-400 mb-6">
            Get a professional haircut with styling and hot towel treatment.
          </p>

          {/* Service Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>60 min</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>Google Meet</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Europe/Bucharest</span>
            </div>
          </div>

          {/* Price */}
          <div className="mt-auto pt-6">
            <p className="text-2xl font-bold text-white">$45</p>
          </div>
        </div>

        {/* Center Panel - Preview Message */}
        <div className="flex-1 bg-[#1a1a1a] p-8 flex items-center justify-center border-r border-[#2a2a2a]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Booking Form Preview
            </h3>
            <p className="text-gray-400 max-w-sm">
              This is how your booking form will appear to customers. The dark theme with red accents matches the Cal.com design.
            </p>
          </div>
        </div>

        {/* Right Panel - Time Slots Preview */}
        <div className="w-[280px] bg-[#1a1a1a] p-6">
          <div className="flex gap-2 mb-6">
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2a2a] text-white">
              12h
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500">
              24h
            </span>
          </div>

          <h4 className="text-sm font-medium text-white mb-4">
            Tue 03
          </h4>

          <div className="space-y-2">
            <div className="w-full py-3 px-4 rounded-xl border border-red-500 bg-red-500/10 text-white font-medium text-center">
              11:00 AM
            </div>
            <div className="w-full py-3 px-4 rounded-xl border border-[#2a2a2a] text-white font-medium text-center">
              12:00 PM
            </div>
            <div className="w-full py-3 px-4 rounded-xl border border-[#2a2a2a] text-white font-medium text-center">
              1:00 PM
            </div>
            <div className="w-full py-3 px-4 rounded-xl border border-[#2a2a2a] text-white font-medium text-center">
              2:00 PM
            </div>
          </div>

          <div className="mt-6">
            <Button className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold">
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingFormPreview;
