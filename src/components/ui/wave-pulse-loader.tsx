"use client";

import Lottie from "lottie-react";

import animationData from "@/assets/lotties/wave-pulse-loading.json";
import { cn } from "@/lib/utils";

interface WavePulseLoaderProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const sizeMap = {
  small: { width: 200, height: 20 },
  medium: { width: 400, height: 40 },
  large: { width: 600, height: 60 },
};

export function WavePulseLoader({ size = "medium", className }: WavePulseLoaderProps) {
  const dimensions = sizeMap[size];

  return (
    <div className={cn("flex items-center justify-center w-full", className)}>
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: "100%",
        }}
      />
    </div>
  );
}
