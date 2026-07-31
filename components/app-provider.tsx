"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedData, demoUsers } from "@/lib/mock-data";
import type {
  AppData,
  Booking,
  Driver,
  Role,
  User,
  Vehicle,
} from "@/lib/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  insertBooking,
  loadAppData,
  loadProfile,
  persistBookingUpdate,
  persistDriver,
  persistVehicle,
} from "@/lib/supabase/repository";
import { resubmitBooking as persistResubmission } from "@/lib/supabase/resubmit";

type Ctx = {
  data: AppData;
  role: Role;
  user: User;
  configured: boolean;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  setRole: (role: Role) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithMicrosoft: (nextPath: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateBooking: (id: string, patch: Partial<Booking>) => Promise<void>;
  addBooking: (booking: Booking) => Promise<Booking>;
  resubmitBooking: (booking: Booking) => Promise<void>;
  saveVehicle: (vehicle: Vehicle) => Promise<void>;
  saveDriver: (driver: Driver) => Promise<void>;
  reset: () => void;
};

const AppContext = createContext<Ctx | null>(null);
const DATA_KEY = "csrs-mvp-data";
const ROLE_KEY = "csrs-role";
const SESSION_BACKUP_KEY = "tokin-transport-session";

type SessionBackup = { access_token: string; refresh_token: string };

function readSessionBackup(): SessionBackup | null {
  try {
    const value = window.localStorage.getItem(SESSION_BACKUP_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<SessionBackup>;
    return parsed.access_token && parsed.refresh_token
      ? {
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        }
      : null;
  } catch {
    return null;
  }
}

function storeSessionBackup(session: SessionBackup | null) {
  if (session)
    window.localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_BACKUP_KEY);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<AppData>(seedData);
  const [role, setRoleState] = useState<Role>("requester");
  const [user, setUser] = useState<User>(demoUsers[0]);
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [demoReady, setDemoReady] = useState(false);

  const refresh = async () => {
    if (!supabase) return;
    setData(await loadAppData(supabase));
  };

  useEffect(() => {
    if (!supabase) {
      try {
        const saved = localStorage.getItem(DATA_KEY);
        if (saved) setData(JSON.parse(saved));
        const savedRole = localStorage.getItem(ROLE_KEY) as Role | null;
        if (savedRole) {
          setRoleState(savedRole);
          setUser(
            demoUsers.find((item) => item.role === savedRole) ?? demoUsers[0],
          );
        }
      } finally {
        setDemoReady(true);
      }
      return;
    }

    let active = true;
    const hydrate = async () => {
      try {
        setLoading(true);
        let { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError || !authData.user) {
          const backup = readSessionBackup();
          if (backup) {
            const { error: restoreError } =
              await supabase.auth.setSession(backup);
            if (!restoreError)
              ({ data: authData, error: authError } =
                await supabase.auth.getUser());
            else storeSessionBackup(null);
          }
        }
        if (authError || !authData.user) {
          if (active) setAuthenticated(false);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) storeSessionBackup(sessionData.session);
        const [profile, appData] = await Promise.all([
          loadProfile(supabase),
          loadAppData(supabase),
        ]);
        if (active) {
          setUser(profile);
          setRoleState(profile.role);
          setData(appData);
          setAuthenticated(true);
          setError(null);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load application data.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          if (session) storeSessionBackup(session);
          window.setTimeout(() => void hydrate(), 0);
        }
        if (event === "SIGNED_OUT") {
          storeSessionBackup(null);
          setAuthenticated(false);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase && demoReady)
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data, demoReady, supabase]);

  const setRole = (nextRole: Role) => {
    if (supabase) return;
    setRoleState(nextRole);
    setUser(demoUsers.find((item) => item.role === nextRole) ?? demoUsers[0]);
    localStorage.setItem(ROLE_KEY, nextRole);
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return;
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
  };

  const signInWithMicrosoft = async (nextPath: string) => {
    if (!supabase) return;
    setError(null);
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", nextPath);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email",
        redirectTo: redirectUrl.toString(),
      },
    });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      storeSessionBackup(null);
    }
  };

  const updateBooking = async (id: string, patch: Partial<Booking>) => {
    if (!supabase) {
      setData((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === id ? { ...booking, ...patch } : booking,
        ),
      }));
      return;
    }
    try {
      await persistBookingUpdate(supabase, id, patch);
      await refresh();
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update booking.",
      );
      throw cause;
    }
  };

  const addBooking = async (booking: Booking) => {
    if (!supabase) {
      setData((current) => ({
        ...current,
        bookings: [booking, ...current.bookings],
      }));
      return booking;
    }
    const created = await insertBooking(supabase, booking);
    await refresh();
    return created;
  };

  const resubmitBooking = async (booking: Booking) => {
    if (!supabase) {
      setData((current) => ({
        ...current,
        bookings: current.bookings.map((item) =>
          item.id === booking.id
            ? {
                ...booking,
                status: "pending_approval",
                rejectReason: undefined,
              }
            : item,
        ),
      }));
      return;
    }
    await persistResubmission(supabase, booking);
    await refresh();
  };

  const saveVehicle = async (vehicle: Vehicle) => {
    if (!supabase) {
      setData((current) => ({
        ...current,
        vehicles: current.vehicles.some((item) => item.id === vehicle.id)
          ? current.vehicles.map((item) =>
              item.id === vehicle.id ? vehicle : item,
            )
          : [...current.vehicles, vehicle],
      }));
      return;
    }
    await persistVehicle(supabase, vehicle);
    await refresh();
  };

  const saveDriver = async (driver: Driver) => {
    if (!supabase) {
      setData((current) => ({
        ...current,
        drivers: current.drivers.some((item) => item.id === driver.id)
          ? current.drivers.map((item) =>
              item.id === driver.id ? driver : item,
            )
          : [...current.drivers, driver],
      }));
      return;
    }
    await persistDriver(supabase, driver);
    await refresh();
  };

  const reset = () => {
    if (supabase) return;
    setData(seedData);
    localStorage.removeItem(DATA_KEY);
  };

  const value = useMemo<Ctx>(
    () => ({
      data,
      role,
      user,
      configured: isSupabaseConfigured,
      authenticated,
      loading,
      error,
      setRole,
      signIn,
      signInWithMicrosoft,
      signOut,
      updateBooking,
      addBooking,
      resubmitBooking,
      saveVehicle,
      saveDriver,
      reset,
    }),
    [data, role, user, authenticated, loading, error],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
};
