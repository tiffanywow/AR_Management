import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile, UserRole } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  devRoleOverride: UserRole | null;
  setDevRoleOverride: (role: UserRole | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [devRoleOverride, setDevRoleOverride] = useState<UserRole | null>(null);

  useEffect(() => {
    const fetchProfile = async (userId: string, retryCount = 0): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);

          if (retryCount < 3) {
            console.log(`Retrying profile fetch (attempt ${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(userId, retryCount + 1);
          }

          throw error;
        }

        if (!data) {
          console.error('No profile found for user:', userId);

          if (retryCount < 3) {
            console.log(`Retrying profile fetch (attempt ${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(userId, retryCount + 1);
          }
        }

        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!profile) return false;
    const effectiveRole = devRoleOverride || profile.role;
    return roles.includes(effectiveRole);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, hasRole, devRoleOverride, setDevRoleOverride }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
