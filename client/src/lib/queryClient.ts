import { QueryClient } from "@tanstack/react-query";

type FetcherOptions = {
  on401?: "throw" | "returnNull";
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  headers: HeadersInit = {}
): Promise<Response> {
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Include cookies for authentication
  });

  if (!response.ok) {
    // Try to parse error message from response
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If we can't parse JSON, just use the status text
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    throw error;
  }

  return response;
}

export function getQueryFn(options: FetcherOptions = {}) {
  return async ({ queryKey }: { queryKey: any[] }) => {
    const [url] = queryKey;

    try {
      const response = await apiRequest("GET", url);
      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.message.includes("401") && options.on401 === "returnNull") {
        return null;
      }
      throw error;
    }
  };
}