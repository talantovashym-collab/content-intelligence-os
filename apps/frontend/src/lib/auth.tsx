'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { authApi, getToken, setToken, type User } from '@/lib/api';

interface AuthContextValue {
  user: User;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Gate for signed-in pages: sends visitors without a valid token to /login
 * (remembering where they were going) and provides the current user.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const toLogin = useCallback(() => {
    queryClient.clear();
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [queryClient, router, pathname]);

  useEffect(() => {
    const present = !!getToken();
    setHasToken(present);
    if (!present) toLogin();
    // api() fires this when the backend rejects the token (expired, or the key changed)
    const onLogout = () => {
      setHasToken(false);
      toLogin();
    };
    window.addEventListener('ci:logout', onLogout);
    return () => window.removeEventListener('ci:logout', onLogout);
  }, [toLogin]);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: hasToken === true,
    retry: false,
    staleTime: Infinity,
  });

  const logout = useCallback(() => {
    setToken(null);
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);

  if (me.isError && hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <p className="font-medium">Could not load your account</p>
          <p className="text-sm text-muted-foreground">{me.error.message}</p>
          <button className="text-sm text-primary underline" onClick={() => me.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!me.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AuthContext.Provider value={{ user: me.data, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <RequireAuth>');
  return ctx;
}
