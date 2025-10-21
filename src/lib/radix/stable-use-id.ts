"use client";

import * as React from "react";

const RADIX_ID_PREFIX = "radix-";
let fallbackCounter = 0;

export function useId(deterministicId?: string): string {
  // Siempre llamar hooks sin condiciones (React Hooks rules)
  const reactId = React.useId();
  const [fallbackId] = React.useState(() => `${RADIX_ID_PREFIX}${++fallbackCounter}`);

  if (deterministicId) {
    return deterministicId;
  }

  if (reactId) {
    return reactId.startsWith(RADIX_ID_PREFIX) ? reactId : `${RADIX_ID_PREFIX}${reactId}`;
  }

  return fallbackId;
}

export default useId;
