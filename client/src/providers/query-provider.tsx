"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside component to avoid sharing state between users
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000, // 30 seconds - data is fresh for this duration
        gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection time
        refetchOnWindowFocus: false, // Don't refetch when user returns to window
        retry: 1, // Retry failed requests once
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default QueryProvider;
