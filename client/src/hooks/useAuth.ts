import { User } from "@shared/schema";

// Mock authentication to avoid React hooks errors
export function useAuth() {
  return {
    user: { id: "mock", email: "test@example.com" } as User,
    isLoading: false,
    isAuthenticated: true,
  };
}