import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { ShieldX } from "lucide-react";

interface RoleGuardProps {
  /** Roles that are allowed to access the wrapped content */
  roles: UserRole[];
  /** Where to redirect unauthenticated users (default: /login) */
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Wraps a route so only users with the correct role can see it.
 *
 * - Unauthenticated → /login
 * - Wrong role      → /  (with a toast-like inline message)
 * - Loading         → nothing (avoids flash)
 */
export default function RoleGuard({ roles, redirectTo = "/", children }: RoleGuardProps) {
  const { state } = useAuth();
  const [, setLocation] = useLocation();

  const isAllowed =
    state.status === "authenticated" && roles.includes(state.user.role);

  useEffect(() => {
    if (state.status === "loading") return;

    if (state.status === "unauthenticated") {
      setLocation("/login");
      return;
    }

    if (!isAllowed) {
      setLocation(redirectTo);
    }
  }, [state.status, isAllowed, redirectTo, setLocation]);

  // Still loading — render nothing to avoid a flash
  if (state.status === "loading") return null;

  // Wrong role — show a brief "access denied" screen while the redirect fires
  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <ShieldX size={48} className="text-red-400/70" />
        <div>
          <p className="text-white font-semibold text-lg">Access Denied</p>
          <p className="text-white/50 text-sm mt-1">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
