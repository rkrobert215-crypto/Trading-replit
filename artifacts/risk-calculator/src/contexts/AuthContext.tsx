import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getMe, logout as authLogout, getToken } from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  refreshUser: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    const u = await getMe();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (getToken()) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const logout = useCallback(() => {
    setUser(null);
    authLogout();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
