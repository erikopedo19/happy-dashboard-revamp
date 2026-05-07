"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FadeInUpTextProps {
  text: string;
  duration?: number;
  stagger?: number;
  distance?: number;
  direction?: "up" | "down" | "left" | "right";
  split?: "word" | "char" | "line";
  trigger?: "mount" | "inView" | "hover";
  className?: string;
  once?: boolean;
}

export function FadeInUpText({
  text,
  duration = 0.5,
  stagger = 0.03,
  distance = 30,
  direction = "up",
  split = "char",
  trigger = "mount",
  className,
  once = true,
}: FadeInUpTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(trigger === "mount");

  const getTransform = () => {
    switch (direction) {
      case "up":
        return `translateY(${distance}px)`;
      case "down":
        return `translateY(-${distance}px)`;
      case "left":
        return `translateX(${distance}px)`;
      case "right":
        return `translateX(-${distance}px)`;
      default:
        return `translateY(${distance}px)`;
    }
  };

  useEffect(() => {
    if (trigger !== "inView" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [trigger, once]);

  const handleMouseEnter = () => {
    if (trigger === "hover") setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (trigger === "hover" && !once) setIsVisible(false);
  };

  const splitText = () => {
    if (split === "word") {
      return text.split(" ");
    }
    if (split === "line") {
      return text.split("\n");
    }
    return text.split("");
  };

  const items = splitText();

  return (
    <span
      ref={containerRef}
      className={cn("inline-flex flex-wrap", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {items.map((item, index) => (
        <span
          key={index}
          className="inline-block overflow-hidden"
          style={{
            marginRight: split === "word" && index < items.length - 1 ? "0.25em" : undefined,
          }}
        >
          <span
            className="inline-block will-change-transform"
            style={{
              transform: isVisible ? "translateY(0) translateX(0)" : getTransform(),
              opacity: isVisible ? 1 : 0,
              transition: `transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1), opacity ${duration}s ease`,
              transitionDelay: `${index * stagger}s`,
            }}
          >
            {item === " " ? "\u00A0" : item}
          </span>
        </span>
      ))}
    </span>
  );
}
