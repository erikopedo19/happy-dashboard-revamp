
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, Users, Calendar, Settings, Smartphone, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sidebarSections = [
  {
    label: 'Settings',
    main: [
      {
        icon: User,
        text: 'Your brand',
        selected: true,
        subsections: [
          { text: 'Brand details', selected: true },
          { text: 'Appearance' },
          { text: 'Contact details' },
          { text: 'Location' },
          { text: 'Business hours' },
          { text: 'Your links' },
        ],
      },
    ],
    sub: [
      { icon: User, text: 'Your profile' },
      { icon: Users, text: 'Your team' },
      { icon: Calendar, text: 'Services' },
      { icon: Settings, text: 'General' },
    ],
    manageHeader: 'MANAGE',
    manage: [
      { icon: Calendar, text: 'Booking Page', chevron: true },
      { icon: Smartphone, text: 'Your branded app' },
      { icon: CreditCard, text: 'Payments', chevron: true },
    ],
  },
];

export default function Brand() {
  const [businessName, setBusinessName] = useState('sdadad');
  const [bookingUrl, setBookingUrl] = useState('sdadad');

  return (
    <div className="min-h-screen bg-[#fafbfa] flex">
      {/* Sidebar */}
      <aside className="w-[250px] border-r border-[#ececec] bg-white flex flex-col py-7 px-0 min-h-screen">
        <nav className="flex-1 px-5">
          <div>
            <p className="mb-5 text-[15px] tracking-wide font-semibold text-[#222]">Settings</p>
            {sidebarSections[0].main.map((item) => (
              <div key={item.text} className="mb-4">
                <div className={`group flex items-center rounded-lg px-2 py-2 ${item.selected ? 'bg-[#f5f4fd]' : ''}`}>
                  <item.icon className="w-[17px] h-[17px] text-[#b4b3c7] mr-2" />
                  <span className={`text-[15px] font-medium flex-1 ${item.selected ? 'text-[#695cfb]' : 'text-[#444] group-hover:text-[#695cfb]'}`}>
                    {item.text}
                  </span>
                  <ChevronDown className="w-[15px] h-[15px] text-[#d7d8e0]" />
                </div>
                {/* Subsections */}
                {item.subsections && (
                  <div className="ml-7">
                    {item.subsections.map((sub, i) => (
                      <div
                        key={sub.text}
                        className={`px-2.5 py-1.5 my-0.5 flex items-center text-[15px] rounded-md relative ${sub.selected ? 'bg-[#fff] text-[#e68b2d] font-semibold' : 'text-[#a4a6b9] hover:bg-[#f6f6fa] cursor-pointer'}`}
                      >
                        {sub.selected && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#e68b2d] rounded-r" />}
                        <span className="ml-2">{sub.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4">
              {sidebarSections[0].sub.map((item) => (
                <div key={item.text} className="flex items-center px-2 py-1.5 mb-1.5 rounded-md hover:bg-[#f7f8f9] transition cursor-pointer">
                  <item.icon className="w-[17px] h-[17px] text-[#bdc0d6] mr-2" />
                  <span className="text-[15px] text-[#747897]">{item.text}</span>
                </div>
              ))}
            </div>
            {/* Manage */}
            <div className="mt-8">
              <span className="block text-[12px] font-bold text-[#c9cad6] mb-1 ml-2 tracking-widest">{sidebarSections[0].manageHeader}</span>
              {sidebarSections[0].manage.map((item) => (
                <div key={item.text} className="flex items-center px-2 py-2 rounded-md hover:bg-[#f7f8f9] mb-1.5 transition cursor-pointer">
                  <item.icon className="w-[17px] h-[17px] text-[#dedee8] mr-2" />
                  <span className="text-[15px] text-[#b9b9cd] flex-1">{item.text}</span>
                  {item.chevron && <ChevronRight className="w-[15px] h-[15px] text-[#dedee8]" />}
                </div>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col px-0" style={{ minWidth: 0 }}>
        <div className="w-full" style={{ minWidth: 0 }}>
          {/* Header */}
          <div className="flex items-center py-8 px-16 border-b border-[#ececec] bg-white">
            <h1 className="text-[22px] font-semibold text-[#2d2c4f] mr-5">Your brand</h1>
            <div className="flex items-center">
              {/* Progress ring (SVG) */}
              <svg width="34" height="34" className="mr-2" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#f3f2fe" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#a099fa" strokeWidth="4" strokeDasharray="113" strokeDashoffset="73" strokeLinecap="round" />
                <text x="50%" y="56%" textAnchor="middle" className="text-[12px] fill-[#685cfa] font-bold" fontSize="11" fontFamily="inherit" dy=".1em">35%</text>
              </svg>
              <span className="ml-1 text-[15px] font-medium text-[#8786a3]">complete</span>
            </div>
            <div className="ml-auto flex items-center">
              <Button
                className="rounded-full px-7 py-2 bg-[#f3f2fe] text-[#695cfb] hover:bg-[#ece8fd] font-semibold shadow-none"
                variant="secondary"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Main form + preview columns */}
          <div className="flex flex-row gap-8 p-12 pb-8 overflow-x-auto">
            {/* Brand details */}
            <div className="flex-[2] min-w-[330px] max-w-[530px]">
              <h2 className="text-lg font-semibold text-[#353462] mb-6">Brand details</h2>
              <Card className="p-8 mb-7 rounded-2xl border-[#f1f0fb] shadow-sm bg-white">
                {/* Banner upload */}
                <div className="mb-7">
                  <div className="rounded-[12px] border border-[#ececec] bg-[#f9f9fc] flex flex-col items-center py-8 px-4">
                    <span className="text-3xl text-[#e3e0f5] mb-3">⇡</span>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-5 py-2 rounded-full border-[#d7d7d7] font-normal text-[15px] bg-white hover:bg-[#f1f9f4] text-[#7771b5]"
                    >
                      <span className="mr-2">🖼️</span>
                      Upload banner image
                    </Button>
                  </div>
                </div>
                {/* Brand logo row */}
                <div className="flex items-center gap-6 mb-7">
                  <div className="w-20 h-20 rounded-full border border-[#ececec] bg-[#f9f9fc] flex items-center justify-center text-3xl text-[#e3e0f5]">⇡</div>
                  <div className="flex-1">
                    <div className="font-medium text-[15px] text-[#252363] mb-0.5">Brand logo</div>
                    <div className="text-xs text-[#bcbadf] mb-2">200 × 200px, up to 10MB</div>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-5 py-1.5 rounded-full border-[#dadada] bg-white font-medium text-[15px] text-[#8881d9] hover:bg-[#f1f9f4]"
                    >
                      <span className="mr-2">🖼️</span>
                      Upload logo
                    </Button>
                  </div>
                </div>
                {/* Business name */}
                <div className="mb-4">
                  <Label htmlFor="businessName" className="mb-1 text-[14.8px] text-[#454574] font-medium block">
                    Business name
                  </Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="max-w-lg rounded-md border-[#edecef] text-[15px] bg-[#fbfbfd] py-2.5 px-3"
                  />
                </div>
                {/* Booking page URL */}
                <div className="mb-4">
                  <Label htmlFor="bookingUrl" className="mb-1 text-[14.8px] text-[#454574] font-medium block">
                    Your Booking Page URL
                  </Label>
                  <div className="flex max-w-lg">
                    <Input
                      id="bookingUrl"
                      value={bookingUrl}
                      onChange={(e) => setBookingUrl(e.target.value)}
                      className="rounded-l-md rounded-r-none border-r-0 border-[#edecef] text-[15px] bg-[#fbfbfd] py-2.5 px-3"
                    />
                    <div className="px-3 py-2.5 flex items-center bg-[#f2f2fa] border border-l-0 border-[#edecef] rounded-r-md text-sm text-[#b4b1ce]">
                      .setmore.com
                    </div>
                  </div>
                </div>
                {/* Industry */}
                <div className="mb-4">
                  <Label className="mb-1 text-[14.8px] text-[#454574] font-medium block">Industry</Label>
                  <Select defaultValue="automotive">
                    <SelectTrigger className="max-w-lg rounded-md border-[#edecef] text-[15px] bg-[#fbfbfd] focus:ring-0 py-2.5 px-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[40] bg-white border border-[#edecef] shadow-lg">
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* About */}
                <div>
                  <Label className="mb-1 text-[14.8px] text-[#454574] font-medium block">About</Label>
                  <textarea
                    placeholder="Tell the world about your brand"
                    className="w-full max-w-lg p-3 rounded-md border border-[#edecef] text-[15px] bg-[#fbfbfd] resize-none h-[70px]"
                  />
                </div>
              </Card>
            </div>
            {/* Right: Preview etc */}
            <div className="flex flex-col w-[360px] flex-shrink-0 gap-4 pt-5">
              {/* Preview URL */}
              <div>
                <div className="text-[14px] mb-2 pl-1 text-[#b1b0bc]">Preview</div>
                <div className="mb-2 px-1">
                  <div className="rounded-[8px] bg-[#fcfcfe] px-4 py-2 border border-[#eaeaf5] text-[15px] text-[#918fbd]">
                    https://{bookingUrl}.setmore.com
                  </div>
                </div>
                <div className="rounded-2xl bg-[#212224] h-[220px] flex items-center justify-center mb-5 mt-1 shadow-sm">
                  <img
                    src="/lovable-uploads/brand-mobile-mockup.png"
                    alt="Mobile preview"
                    className="h-[130px] w-[68px] object-contain rounded-xl shadow"
                    style={{ background: '#17181a' }}
                  />
                </div>
              </div>
              {/* Help section */}
              <div className="rounded-2xl bg-white px-4 py-5 border border-[#ececec] text-center shadow-sm">
                <div className="flex justify-center -space-x-2 mb-3">
                  <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-white" />
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-white" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-white" />
                </div>
                <div className="font-semibold text-[#202325] mb-1">Need help with your Booking Page?</div>
                <div className="mb-4 text-sm text-[#737677]">We're real people here to help you 24/7</div>
                <Button variant="outline" className="w-full rounded-full bg-[#fbfbfd] text-[15px] border-[#edecef] text-[#6c62b3] hover:bg-[#f2f0f9]">
                  💬 Connect with us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
