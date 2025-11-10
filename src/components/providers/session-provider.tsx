"use client";

import type { ReactNode } from "react";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

interface Props {
  children: ReactNode;
  session: Session | null;
}

export function AuthSessionProvider({ children, session }: Props) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
