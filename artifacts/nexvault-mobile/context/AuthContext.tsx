import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const TOKEN_KEY = "nexvault_token";
const USER_KEY = "nexvault_user";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  kycStatus: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "(auth)";
    if (token && inAuth) {
      router.replace("/(tabs)");
    } else if (!token && !inAuth) {
      router.replace("/(auth)/login");
    }
  }, [token, isLoading, segments]);

  const signIn = useCallback(async (newToken: string, newUser: User) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
