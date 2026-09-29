import React from "react";
import { ShaderGradient } from "@23rd/shader-gradient";

interface ShaderGradientProps {
  className?: string;
}

const ShaderGradientComponent = React.forwardRef<
  HTMLDivElement,
  ShaderGradientProps
>(({ className }, ref) => {
  return (
    <div ref={ref} className={className}>
      <ShaderGradient
        type="plane"
        uTime={0.2}
        uSpeed={0.4}
        uStrength={1.3}
        uDensity={1.5}
        uFrequency={3.5}
        uAmplitude={5.0}
        uColor1="#ff7b00"
        uColor2="#ff4d00"
        uColor3="#ff8800"
      />
    </div>
  );
});

ShaderGradientComponent.displayName = "ShaderGradientComponent";

export { ShaderGradientComponent as ShaderGradient };
