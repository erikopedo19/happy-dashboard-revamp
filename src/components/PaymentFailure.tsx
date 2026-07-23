"use client";

import * as React from "react";
import { XCircle, RefreshCw, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PaymentFailureProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  message?: string;
  reasons?: string[];
  isRetrying?: boolean;
  retryButtonText?: string;
  secondaryButtonText?: string;
  tertiaryButtonText?: string;
  onRetry?: () => void;
  onSecondary?: () => void;
  onTertiary?: () => void;
}

export const PaymentFailure = React.forwardRef<
  HTMLDivElement,
  PaymentFailureProps
>(
  (
    {
      className,
      title = "Payment Failed",
      subtitle = "We couldn't process your payment.",
      message = "Please check your payment details and try again, or contact your bank for more information.",
      reasons = [
        "Insufficient funds in your account",
        "Incorrect card details or expired card",
        "Card declined by your bank",
        "Network connection issues",
      ],
      isRetrying = false,
      retryButtonText = "Try Again",
      secondaryButtonText = "Home",
      tertiaryButtonText = "Support",
      onRetry,
      onSecondary,
      onTertiary,
      ...props
    },
    ref,
  ) => {
    return (
      <Card ref={ref} className={cn("w-full max-w-md", className)} {...props}>
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-destructive/10 rounded-full p-3">
              <XCircle className="text-destructive h-16 w-16" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="mt-2 text-base">
              {subtitle}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {reasons.length > 0 && (
            <div className="bg-muted space-y-2 rounded-lg p-4">
              <h3 className="text-sm font-semibold">
                Common reasons for payment failure:
              </h3>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {message && (
            <p className="text-muted-foreground text-center text-sm">
              {message}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button
            onClick={onRetry}
            className="w-full"
            disabled={isRetrying || !onRetry}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryButtonText}
              </>
            )}
          </Button>

          {(onSecondary || onTertiary) && (
            <div className="flex w-full gap-2">
              {onSecondary && (
                <Button
                  onClick={onSecondary}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  {secondaryButtonText}
                </Button>
              )}

              {onTertiary && (
                <Button
                  onClick={onTertiary}
                  variant="outline"
                  className="flex-1"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {tertiaryButtonText}
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    );
  },
);

PaymentFailure.displayName = "PaymentFailure";
