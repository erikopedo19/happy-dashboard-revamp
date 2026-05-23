"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CalendarDays,
  CircleCheck,
  CircleAlert,
  MessageSquare,
  Zap,
  Star,
  Bell,
  Heart,
  Mail,
} from "lucide-react";

function IOS26Icon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: color + "18", color }}
    >
      {children}
    </div>
  );
}

export default function Particle() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <Button
        variant="outline"
        className="rounded-2xl h-12 gap-3 border-gray-200/60 bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.02] transition-all shadow-sm"
        onClick={() => {
          toast({
            title: "Event has been created",
            description: "Monday, January 3rd at 6:00pm",
          });
        }}
      >
        <IOS26Icon color="#e11d48">
          <CalendarDays className="w-[18px] h-[18px]" strokeWidth={2} />
        </IOS26Icon>
        Default Toast
      </Button>

      <Button
        variant="outline"
        className="rounded-2xl h-12 gap-3 border-gray-200/60 bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.02] transition-all shadow-sm"
        onClick={() => {
          toast({
            title: "Success",
            description: "Your changes have been saved successfully.",
          });
        }}
      >
        <IOS26Icon color="#22c55e">
          <CircleCheck className="w-[18px] h-[18px]" strokeWidth={2} />
        </IOS26Icon>
        Success
      </Button>

      <Button
        variant="outline"
        className="rounded-2xl h-12 gap-3 border-gray-200/60 bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.02] transition-all shadow-sm"
        onClick={() => {
          toast({
            title: "Warning",
            description: "Your subscription will expire in 3 days.",
          });
        }}
      >
        <IOS26Icon color="#f59e0b">
          <CircleAlert className="w-[18px] h-[18px]" strokeWidth={2} />
        </IOS26Icon>
        Warning
      </Button>

      <Button
        variant="outline"
        className="rounded-2xl h-12 gap-3 border-gray-200/60 bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.02] transition-all shadow-sm"
        onClick={() => {
          toast({
            title: "New Message",
            description: "You have a new message from Sarah.",
          });
        }}
      >
        <IOS26Icon color="#3b82f6">
          <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2} />
        </IOS26Icon>
        Message
      </Button>

      <Button
        variant="outline"
        className="rounded-2xl h-12 gap-3 border-gray-200/60 bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.02] transition-all shadow-sm"
        onClick={() => {
          toast({
            title: "Booking Confirmed",
            description: "Your appointment is set for tomorrow at 2:00 PM.",
          });
        }}
      >
        <IOS26Icon color="#8b5cf6">
          <Zap className="w-[18px] h-[18px]" strokeWidth={2} />
        </IOS26Icon>
        Confirmed
      </Button>

      <Button
        variant="outline"
        className="rounded-2xl h-12 gap-3 border-gray-200/60 bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:scale-[1.02] transition-all shadow-sm"
        onClick={() => {
          toast({
            title: "New Review",
            description: "Someone left a 5-star review on your profile.",
          });
        }}
      >
        <IOS26Icon color="#f59e0b">
          <Star className="w-[18px] h-[18px]" strokeWidth={2} />
        </IOS26Icon>
        Review
      </Button>
    </div>
  );
}
