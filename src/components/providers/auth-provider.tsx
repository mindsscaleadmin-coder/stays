"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  clearDemoUser,
  createDemoUser,
  getDemoUser,
  setDemoUser,
  updateDemoUser,
} from "@/lib/auth/demo-auth";
import { isValidAdminInviteCode } from "@/lib/auth/admin-invite";
import { canAccessAdmin, canBook, canManageListings } from "@/lib/auth/roles";
import type { GuestUser } from "@/lib/auth/types";
import {
  endHostImpersonation,
  isImpersonating,
  startHostImpersonation,
} from "@/lib/admin/impersonation";
import type { AdminUserRecord } from "@/lib/admin/user-types";
import { getUserAccountStatus, isHostAccountLocked, findAdminUser } from "@/lib/admin/user-data";
import { findHostStaffLogin, findActiveHostStaffByEmail } from "@/lib/host/host-staff-data";
import {
  hostStaffLoginViaApi,
  shouldUseSharedHostStaff,
} from "@/lib/host/host-staff-api";
import type { HostStaffRole } from "@/lib/host/host-staff-types";
import { ensureSuperAdminStaff, getStaffByEmail, verifyAdminStaffPassword } from "@/lib/admin/staff-data";
import {
  adminStaffLoginViaApi,
  fetchAdminStaffByEmailFromApi,
  claimAdminViaApi,
  saveAdminStaffViaApi,
  shouldUseSharedAdminStaff,
} from "@/lib/admin/staff-api";
import { DEFAULT_PERMISSIONS } from "@/lib/admin/staff-types";
import { isInactiveStaffEmail, resolveStaffForAdminEmail, staffHasPermission } from "@/lib/admin/staff-access";
import { gateAuthRateLimit } from "@/lib/auth/rate-limit-gate";

async function queueWelcomeEmail() {
  try {
    await fetch("/api/auth/welcome", { method: "POST" });
  } catch {
    // non-blocking
  }
}

interface AuthContextValue {
  user: GuestUser | null;
  loading: boolean;
  isDemo: boolean;
  isAdmin: boolean;
  isHost: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signInAdminWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signInHostWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<{ error?: string }>;
  signUpAdminWithEmail: (input: {
    email: string;
    password: string;
    fullName: string;
    inviteCode: string;
  }) => Promise<{ error?: string }>;
  signUpHostWithEmail: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    country?: string;
  }) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  sendPhoneOtp: (phone: string) => Promise<{ error?: string }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<GuestUser>) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  impersonating: boolean;
  startImpersonatingHost: (host: AdminUserRecord) => { error?: string };
  stopImpersonating: () => void;
  isHostAccountRestricted: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSupabaseUser(user: User): GuestUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: meta.full_name ?? meta.fullName ?? user.email?.split("@")[0] ?? "Guest",
    phone: user.phone ?? meta.phone,
    country: meta.country,
    roles: meta.roles ?? ["guest"],
    language: meta.language ?? "en",
    avatarUrl: meta.avatar_url ?? meta.avatarUrl ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const supabaseEnabled = isSupabaseConfigured();
  const isDemo = !supabaseEnabled;

  const supabase = useMemo(
    () => (supabaseEnabled ? createClient() : null),
    [supabaseEnabled]
  );

  useEffect(() => {
    async function init() {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user ? mapSupabaseUser(data.session.user) : null);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ? mapSupabaseUser(session.user) : null);
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }

      const demo = getDemoUser();
      if (demo && canManageListings(demo.roles) && !demo.country) {
        const adminHost = findAdminUser({ id: demo.id, email: demo.email });
        if (adminHost?.country) {
          const enriched = { ...demo, country: adminHost.country, phone: demo.phone || adminHost.phone };
          setDemoUser(enriched);
          setUser(enriched);
          setImpersonating(isImpersonating());
          setLoading(false);
          return;
        }
      }
      setUser(demo);
      setImpersonating(isImpersonating());
      setLoading(false);
    }

    init();
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const limited = await gateAuthRateLimit(email);
      if (limited.error) return limited;

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };

        const roles = (data.user?.user_metadata?.roles as string[] | undefined) ?? [];
        if (!canBook(roles)) {
          await supabase.auth.signOut();
          return { error: "Access denied. Guest account required." };
        }
        return {};
      }

      const demo = getDemoUser();
      const normalized = email.trim().toLowerCase();
      const guestUser = createDemoUser({
        email: normalized,
        fullName: demo?.email.toLowerCase() === normalized
          ? demo.fullName
          : normalized.split("@")[0],
        phone: demo?.email.toLowerCase() === normalized ? demo.phone : undefined,
        country: demo?.email.toLowerCase() === normalized ? demo.country : undefined,
        roles: ["guest"],
      });
      setDemoUser(guestUser);
      setUser(guestUser);
      return {};
    },
    [supabase]
  );

  const signInAdminWithEmail = useCallback(
    async (email: string, password: string) => {
      const limited = await gateAuthRateLimit(email);
      if (limited.error) return limited;

      const normalizedEmail = email.trim().toLowerCase();

      if (shouldUseSharedAdminStaff()) {
        try {
          const member = await fetchAdminStaffByEmailFromApi(normalizedEmail);
          if (member && !member.active) {
            return { error: "This staff account is deactivated. Contact a Super Admin." };
          }
        } catch {
          // fall through
        }
      } else if (isInactiveStaffEmail(normalizedEmail)) {
        return { error: "This staff account is deactivated. Contact a Super Admin." };
      }

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };

        const roles = (data.user?.user_metadata?.roles as string[] | undefined) ?? [];
        if (!canAccessAdmin(roles)) {
          await supabase.auth.signOut();
          return { error: "Access denied. Admin account required." };
        }
        return {};
      }

      endHostImpersonation();
      setImpersonating(false);

      if (shouldUseSharedAdminStaff()) {
        try {
          const result = await adminStaffLoginViaApi(normalizedEmail, password);
          if (!result.ok) return { error: result.error };
          const knownStaff = result.member;
          const displayName =
            knownStaff?.name ?? (normalizedEmail.split("@")[0] || "Admin");
          const demo = getDemoUser();
          if (
            demo &&
            demo.email.toLowerCase() === normalizedEmail &&
            canAccessAdmin(demo.roles)
          ) {
            const refreshed = { ...demo, fullName: displayName, roles: ["admin"] as string[] };
            setDemoUser(refreshed);
            setUser(refreshed);
            return {};
          }
          const newUser = createDemoUser({
            email: normalizedEmail,
            fullName: displayName,
            roles: ["admin"],
          });
          setDemoUser(newUser);
          setUser(newUser);
          return {};
        } catch {
          // fall through to localStorage demo auth
        }
      }

      const passwordCheck = verifyAdminStaffPassword(normalizedEmail, password);
      if (!passwordCheck.ok) return { error: passwordCheck.error };

      const knownStaff = passwordCheck.member ?? getStaffByEmail(normalizedEmail);
      const displayName =
        knownStaff?.name ?? (normalizedEmail.split("@")[0] || "Admin");

      const demo = getDemoUser();
      if (
        demo &&
        demo.email.toLowerCase() === normalizedEmail &&
        canAccessAdmin(demo.roles)
      ) {
        const refreshed = { ...demo, fullName: displayName, roles: ["admin"] as string[] };
        setDemoUser(refreshed);
        setUser(refreshed);
        return {};
      }

      const newUser = createDemoUser({
        email: normalizedEmail,
        fullName: displayName,
        roles: ["admin"],
      });
      setDemoUser(newUser);
      setUser(newUser);
      return {};
    },
    [supabase]
  );

  const signInHostWithEmail = useCallback(
    async (email: string, password: string) => {
      const limited = await gateAuthRateLimit(email);
      if (limited.error) return limited;

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };

        const roles = (data.user?.user_metadata?.roles as string[] | undefined) ?? [];
        if (!canManageListings(roles)) {
          await supabase.auth.signOut();
          return { error: "Access denied. Host account required." };
        }
        return {};
      }

      if (shouldUseSharedHostStaff()) {
        try {
          const result = await hostStaffLoginViaApi(email, password);
          if (result.ok) {
            const owner = findAdminUser({ id: result.staff.hostId });
            const session: GuestUser = {
              ...createDemoUser({
                email: result.staff.email,
                fullName: result.staff.name,
                phone: owner?.phone,
                country: owner?.country,
                roles: ["host"],
              }),
              staffHostId: result.staff.hostId,
              staffMemberId: result.staff.id,
              staffRole: result.staff.role as HostStaffRole,
            };
            setDemoUser(session);
            setUser(session);
            return {};
          }
          if (!result.ok && result.error !== "Invalid email or password.") {
            return { error: result.error };
          }
        } catch {
          // fall through to localStorage demo auth
        }
      } else {
        const staffMatch = findHostStaffLogin(email, password);
        if (staffMatch) {
          const owner = findAdminUser({ id: staffMatch.hostId });
          const session: GuestUser = {
            ...createDemoUser({
              email: staffMatch.email,
              fullName: staffMatch.name,
              phone: owner?.phone,
              country: owner?.country,
              roles: ["host"],
            }),
            staffHostId: staffMatch.hostId,
            staffMemberId: staffMatch.id,
            staffRole: staffMatch.role,
          };
          setDemoUser(session);
          setUser(session);
          return {};
        }

        const staffAccount = findActiveHostStaffByEmail(email);
        if (staffAccount) {
          if (!staffAccount.password) {
            return {
              error:
                "No password set for this staff account. Ask the host owner to set one under User / Staff.",
            };
          }
          return { error: "Invalid email or password." };
        }
      }

      const adminHost = findAdminUser({ email });
      const demo = getDemoUser();
      if (demo && demo.email.toLowerCase() === email.trim().toLowerCase() && canManageListings(demo.roles)) {
        const enriched: GuestUser = {
          ...demo,
          country: demo.country || adminHost?.country,
          phone: demo.phone || adminHost?.phone,
          fullName: demo.fullName || adminHost?.name || demo.fullName,
          staffHostId: undefined,
          staffMemberId: undefined,
          staffRole: undefined,
        };
        if (
          enriched.country !== demo.country ||
          enriched.phone !== demo.phone ||
          demo.staffHostId
        ) {
          setDemoUser(enriched);
        }
        setUser(enriched);
        return {};
      }

      // Demo host login still accepts any password for the account owner.
      void password;
      const newUser = createDemoUser({
        email,
        fullName: adminHost?.name || email.split("@")[0],
        phone: adminHost?.phone,
        country: adminHost?.country,
        roles: ["host"],
      });
      setDemoUser(newUser);
      setUser(newUser);
      return {};
    },
    [supabase]
  );

  const signUpWithEmail = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      const limited = await gateAuthRateLimit(input.email);
      if (limited.error) return limited;

      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName,
              phone: input.phone,
              roles: ["guest"],
            },
          },
        });
        if (!error) void queueWelcomeEmail();
        return { error: error?.message };
      }

      const newUser = createDemoUser(input);
      setDemoUser(newUser);
      setUser(newUser);
      return {};
    },
    [supabase]
  );

  const signUpAdminWithEmail = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      inviteCode: string;
    }) => {
      if (!isValidAdminInviteCode(input.inviteCode)) {
        return { error: "Invalid admin invite code." };
      }

      const limited = await gateAuthRateLimit(input.email);
      if (limited.error) return limited;

      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName,
              roles: ["admin"],
            },
          },
        });
        if (!error) {
          void claimAdminViaApi(input.inviteCode).catch(() => null);
          if (!shouldUseSharedAdminStaff()) {
            ensureSuperAdminStaff(input.email, input.fullName);
          }
          void queueWelcomeEmail();
        }
        return { error: error?.message };
      }

      if (shouldUseSharedAdminStaff()) {
        try {
          await saveAdminStaffViaApi({
            name: input.fullName,
            email: input.email.trim().toLowerCase(),
            role: "admin",
            permissions: [...DEFAULT_PERMISSIONS.admin],
            active: true,
          });
        } catch {
          ensureSuperAdminStaff(input.email, input.fullName);
        }
      } else {
        ensureSuperAdminStaff(input.email, input.fullName);
      }
      const newUser = createDemoUser({
        email: input.email,
        fullName: input.fullName,
        roles: ["admin"],
      });
      setDemoUser(newUser);
      setUser(newUser);
      return {};
    },
    [supabase]
  );

  const signUpHostWithEmail = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      country?: string;
    }) => {
      const limited = await gateAuthRateLimit(input.email);
      if (limited.error) return limited;

      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName,
              phone: input.phone,
              country: input.country,
              roles: ["host"],
            },
          },
        });
        if (!error) void queueWelcomeEmail();
        return { error: error?.message };
      }

      const newUser = createDemoUser({
        ...input,
        roles: ["host"],
      });
      setDemoUser(newUser);
      setUser(newUser);
      return {};
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error: error?.message };
    }

    const newUser = createDemoUser({
      email: "guest@gmail.com",
      fullName: "Google Guest",
    });
    setDemoUser(newUser);
    setUser(newUser);
    return {};
  }, [supabase]);

  const sendPhoneOtp = useCallback(
    async (phone: string) => {
      if (supabase) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        return { error: error?.message };
      }
      return {};
    },
    [supabase]
  );

  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string) => {
      if (supabase) {
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: "sms",
        });
        return { error: error?.message };
      }

      if (token.length >= 4) {
        const newUser = createDemoUser({
          email: `${phone.replace(/\D/g, "")}@phone.local`,
          fullName: "Phone Guest",
          phone,
        });
        setDemoUser(newUser);
        setUser(newUser);
        return {};
      }
      return { error: "Invalid OTP" };
    },
    [supabase]
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string) => {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        });
        return { error: error?.message };
      }
      return {};
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message };
      }
      return {};
    },
    [supabase]
  );

  const updateProfile = useCallback(
    async (updates: Partial<GuestUser>) => {
      if (supabase && user) {
        const data: Record<string, unknown> = {};
        if (updates.fullName !== undefined) data.full_name = updates.fullName;
        if (updates.phone !== undefined) data.phone = updates.phone;
        if (updates.country !== undefined) data.country = updates.country;
        if (updates.language !== undefined) data.language = updates.language;
        if ("avatarUrl" in updates) data.avatar_url = updates.avatarUrl ?? null;
        const { error } = await supabase.auth.updateUser({ data });
        if (error) return { error: error.message };
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...updates };
          if ("avatarUrl" in updates && !updates.avatarUrl) {
            delete next.avatarUrl;
          }
          return next;
        });
        return {};
      }

      const updated = updateDemoUser(updates);
      if (updated) {
        if ("avatarUrl" in updates && !updates.avatarUrl) {
          const { avatarUrl: _, ...rest } = updated;
          setDemoUser(rest);
          setUser(rest);
        } else {
          setUser(updated);
        }
      }
      return {};
    },
    [supabase, user]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    endHostImpersonation();
    clearDemoUser();
    setImpersonating(false);
    setUser(null);
  }, [supabase]);

  const startImpersonatingHost = useCallback(
    (host: AdminUserRecord) => {
      if (!isDemo) {
        return { error: "Impersonation is available in demo mode only." };
      }
      if (!user || !canAccessAdmin(user.roles)) {
        return { error: "Only admins can impersonate hosts." };
      }
      const staff = resolveStaffForAdminEmail(user.email);
      if (!staffHasPermission(staff, "impersonate_hosts")) {
        return { error: "Your role cannot impersonate hosts." };
      }
      if (isHostAccountLocked(host.status)) {
        return { error: "Cannot impersonate a suspended or banned host." };
      }
      const session = startHostImpersonation(user, host);
      setUser(session);
      setImpersonating(true);
      return {};
    },
    [isDemo, user]
  );

  const stopImpersonating = useCallback(() => {
    const restored = endHostImpersonation();
    setImpersonating(false);
    setUser(restored);
  }, []);

  const isAdmin = user ? canAccessAdmin(user.roles) && !impersonating : false;
  const isHost = user ? canManageListings(user.roles) : false;
  const accountStatus = user ? getUserAccountStatus(user.id, user.email) : null;
  const isHostAccountRestricted = accountStatus
    ? isHostAccountLocked(accountStatus)
    : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        isAdmin,
        isHost,
        signInWithEmail,
        signInAdminWithEmail,
        signInHostWithEmail,
        signUpWithEmail,
        signUpAdminWithEmail,
        signUpHostWithEmail,
        signInWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        sendPasswordResetEmail,
        updatePassword,
        updateProfile,
        signOut,
        impersonating,
        startImpersonatingHost,
        stopImpersonating,
        isHostAccountRestricted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
