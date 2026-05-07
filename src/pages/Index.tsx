
import { useState } from 'react';
import { Calendar, Clock, MapPin, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const barbershops = [
  {
    id: 1,
    name: "Classic Cuts",
    address: "123 Main St, Downtown",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&h=200&fit=crop",
    services: ["Haircut", "Beard Trim", "Hot Towel Shave"],
    price: "$25-45"
  },
  {
    id: 2,
    name: "Modern Style",
    address: "456 Oak Ave, Midtown",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=200&fit=crop",
    services: ["Haircut", "Styling", "Color"],
    price: "$30-60"
  },
  {
    id: 3,
    name: "Gentleman's Club",
    address: "789 Pine Rd, Uptown",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=300&h=200&fit=crop",
    services: ["Premium Cut", "Beard Care", "Massage"],
    price: "$40-80"
  }
];

const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

const Index = () => {
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleBooking = () => {
    if (!selectedShop || !selectedDate || !selectedTime || !selectedService || !customerName || !customerPhone) {
      toast({
        title: "Please fill all fields",
        description: "All booking information is required",
        variant: "destructive"
      });
      return;
    }

    // Simulate booking
    toast({
      title: "Booking Confirmed!",
      description: `Your appointment at ${selectedShop.name} is scheduled for ${selectedDate} at ${selectedTime}`,
    });

    // Reset form
    setSelectedShop(null);
    setSelectedDate('');
    setSelectedTime('');
    setSelectedService('');
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-apple-gray-50 to-apple-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-apple-gray-900 mb-4">
            Book Your Perfect Cut
          </h1>
          <p className="text-xl text-apple-gray-600">
            Choose from the best barbershops in your area
          </p>
        </div>

        {/* Barbershop Selection */}
        {!selectedShop ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {barbershops.map((shop) => (
              <Card 
                key={shop.id}
                className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-apple hover:shadow-apple-hover transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedShop(shop)}
              >
                <div className="relative">
                  <img 
                    src={shop.image} 
                    alt={shop.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{shop.rating}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-apple-gray-900 mb-2">{shop.name}</h3>
                  <div className="flex items-center gap-2 text-apple-gray-600 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{shop.address}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {shop.services.map((service, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-gradient-blue text-white text-xs rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  <p className="text-lg font-semibold text-apple-blue">{shop.price}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Booking Form */
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-apple p-8">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setSelectedShop(null)}
                  className="text-apple-blue hover:text-apple-blue/80 transition-colors"
                >
                  ← Back to shops
                </button>
                <h2 className="text-2xl font-semibold text-apple-gray-900">
                  Book at {selectedShop.name}
                </h2>
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                      Your Name
                    </label>
                    <Input 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your name"
                      className="border-apple-gray-300 focus:border-apple-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter your phone"
                      className="border-apple-gray-300 focus:border-apple-blue"
                    />
                  </div>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-700 mb-3">
                    Select Service
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedShop.services.map((service, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedService(service)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          selectedService === service
                            ? 'bg-gradient-blue text-white border-transparent shadow-lg'
                            : 'bg-white border-apple-gray-300 text-apple-gray-700 hover:border-apple-blue'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                    Select Date
                  </label>
                  <Input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="border-apple-gray-300 focus:border-apple-blue"
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-700 mb-3">
                    Select Time
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {timeSlots.map((time, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          selectedTime === time
                            ? 'bg-gradient-blue text-white border-transparent shadow-lg'
                            : 'bg-white border-apple-gray-300 text-apple-gray-700 hover:border-apple-blue'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Book Button */}
                <Button 
                  onClick={handleBooking}
                  className="w-full bg-gradient-blue hover:opacity-90 text-white py-3 text-lg font-medium rounded-lg transition-all duration-200"
                >
                  Confirm Booking
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-apple-gray-500">
            Questions? Contact us at support@barberbooking.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
