"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  ShieldCheck,
  Users as UsersIcon,
  Flame,
  Heart,
  CreditCard,
  ChevronRight,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AdminUser = {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  subscriptionStatus?:
    | "active"
    | "canceled"
    | "past_due"
    | "unpaid"
    | "trialing"
    | null;
  subscriptionType?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  charity?: string;
  timezone?: string;
  days_of_streak?: number;
  currentChallengeId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Totals = {
  total: number;
  active: number;
  trialing: number;
  canceled: number;
};

const FONT_HEADING = "'OggText', 'Ogg', serif";
const FONT_BODY = "'Helvetica Neue', -apple-system, system-ui, sans-serif";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusPill(status?: string | null) {
  const s = status || "none";
  const config: Record<
    string,
    { bg: string; border: string; color: string; label: string }
  > = {
    active: {
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.35)",
      color: "#86efac",
      label: "Active",
    },
    trialing: {
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.35)",
      color: "#93c5fd",
      label: "Trialing",
    },
    canceled: {
      bg: "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.30)",
      color: "#fca5a5",
      label: "Canceled",
    },
    past_due: {
      bg: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.35)",
      color: "#fde68a",
      label: "Past Due",
    },
    unpaid: {
      bg: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.35)",
      color: "#fde68a",
      label: "Unpaid",
    },
    none: {
      bg: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.08)",
      color: "#888888",
      label: "No Sub",
    },
  };
  const c = config[s] || config.none;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontFamily: FONT_BODY,
      }}
    >
      {c.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#141414",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: "20px 24px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.15), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle at top right, ${accent}22, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${accent}18`,
              border: `1px solid ${accent}33`,
              color: accent,
            }}
          >
            {icon}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#888888",
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              fontFamily: FONT_HEADING,
            }}
          >
            {label}
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#f0f0f0",
            fontFamily: FONT_HEADING,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totals, setTotals] = useState<Totals>({
    total: 0,
    active: 0,
    trialing: 0,
    canceled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "trialing" | "none"
  >("all");

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.push("/login?redirect=/admin");
      return;
    }
    loadUsers();
  }, [authLoading, authUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setForbidden(false);

      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        router.push("/login?redirect=/admin");
        return;
      }
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load users");
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotals(
        data.totals || { total: 0, active: 0, trialing: 0, canceled: 0 }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== "all") {
        if (statusFilter === "none") {
          if (u.subscriptionStatus) return false;
        } else if (u.subscriptionStatus !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      const haystack = [
        u.email,
        u.firstName,
        u.lastName,
        u.charity,
        u.subscriptionType,
        u.userId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, statusFilter]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#888" }} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            backgroundColor: "#141414",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 20px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <ShieldCheck color="#fca5a5" size={28} />
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#f0f0f0",
              marginBottom: 8,
              fontFamily: FONT_HEADING,
            }}
          >
            Admin Access Required
          </h1>
          <p
            style={{
              color: "#b0b0b0",
              fontSize: 14,
              marginBottom: 20,
              fontFamily: FONT_BODY,
            }}
          >
            Your account does not have permission to view the admin dashboard.
          </p>
          <button
            onClick={() => router.push("/subscriptions/manage")}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              backgroundColor: "#e0e0e0",
              color: "#1a1a1a",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: FONT_BODY,
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-10 sm:pt-16 pb-20 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#141414",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <ShieldCheck size={22} color="#e0e0e0" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "1.8px",
                  textTransform: "uppercase",
                  color: "#666",
                  fontFamily: FONT_HEADING,
                }}
              >
                Protagonist
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#f0f0f0",
                  fontFamily: FONT_HEADING,
                }}
              >
                Admin Console
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#b0b0b0",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: FONT_BODY,
              cursor: "pointer",
            }}
            className="hover:bg-white/5"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 44px)",
              fontWeight: 800,
              color: "#f0f0f0",
              fontFamily: FONT_HEADING,
              marginBottom: 8,
              letterSpacing: "-0.5px",
            }}
          >
            Users
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: 15,
              fontFamily: FONT_BODY,
            }}
          >
            Monitor subscriptions, streaks, and commitments across the
            Protagonist community.
          </p>
        </motion.div>

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#fca5a5" />
            <span
              style={{ color: "#fca5a5", fontSize: 14, fontFamily: FONT_BODY }}
            >
              {error}
            </span>
          </div>
        )}

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            label="Total Users"
            value={totals.total}
            icon={<UsersIcon size={18} />}
            accent="#e0e0e0"
          />
          <StatCard
            label="Active Subs"
            value={totals.active}
            icon={<CreditCard size={18} />}
            accent="#22c55e"
          />
          <StatCard
            label="Trialing"
            value={totals.trialing}
            icon={<Flame size={18} />}
            accent="#3b82f6"
          />
          <StatCard
            label="Canceled"
            value={totals.canceled}
            icon={<Heart size={18} />}
            accent="#ef4444"
          />
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 mb-5"
        >
          <div className="relative flex-1">
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#666",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, charity..."
              style={{
                width: "100%",
                padding: "12px 14px 12px 40px",
                borderRadius: 12,
                backgroundColor: "#141414",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#e0e0e0",
                fontSize: 14,
                fontFamily: FONT_BODY,
                outline: "none",
              }}
              className="focus:border-white/15"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {(["all", "active", "trialing", "none"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as typeof statusFilter)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  fontFamily: FONT_BODY,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  backgroundColor: statusFilter === f ? "#e0e0e0" : "#141414",
                  color: statusFilter === f ? "#1a1a1a" : "#b0b0b0",
                  border:
                    statusFilter === f
                      ? "1px solid #e0e0e0"
                      : "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.2s",
                }}
              >
                {f === "none" ? "No Sub" : f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            backgroundColor: "#141414",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* Desktop header */}
          <div
            className="hidden lg:flex"
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "rgba(255,255,255,0.015)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              color: "#666",
              fontFamily: FONT_HEADING,
              gap: 12,
            }}
          >
            <div style={{ flex: "0 0 220px" }}>User</div>
            <div style={{ flex: "0 0 110px" }}>Subscription</div>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>Renews</div>
            <div style={{ flex: "0 0 90px" }}>Streak</div>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>Charity</div>
            <div style={{ flex: "0 0 20px" }} />
          </div>

          {filteredUsers.length === 0 ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "#666",
                fontFamily: FONT_BODY,
                fontSize: 14,
              }}
            >
              No users match your filters.
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredUsers.map((u, idx) => (
                <motion.button
                  key={u.userId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.01 }}
                  onClick={() => router.push(`/admin/${u.userId}`)}
                  className="w-full text-left hover:bg-white/2 transition-colors"
                  style={{
                    display: "block",
                    padding: "16px 20px",
                    borderBottom:
                      idx < filteredUsers.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                  }}
                >
                  {/* ── Mobile / tablet (< lg): stacked card ── */}
                  <div className="flex lg:hidden items-center gap-3 w-full">
                    {/* Avatar */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#e0e0e0",
                        fontFamily: FONT_HEADING,
                      }}
                    >
                      {(u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                    </div>

                    {/* Name + email + pills */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="truncate"
                          style={{
                            fontWeight: 600,
                            color: "#f0f0f0",
                            fontSize: 14,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          {u.firstName || u.lastName
                            ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                            : "Unnamed"}
                        </span>
                        {u.isAdmin && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "1px",
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "rgba(234,179,8,0.1)",
                              color: "#fde68a",
                              border: "1px solid rgba(234,179,8,0.25)",
                              fontFamily: FONT_BODY,
                              flexShrink: 0,
                            }}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                      <div
                        className="truncate"
                        style={{
                          color: "#888",
                          fontSize: 12,
                          fontFamily: FONT_BODY,
                          marginBottom: 8,
                        }}
                      >
                        {u.email || "—"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {statusPill(u.subscriptionStatus)}
                        <span
                          className="flex items-center gap-1"
                          style={{
                            color: "#b0b0b0",
                            fontSize: 12,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          <Flame size={12} color="#f97316" />
                          {u.days_of_streak ?? 0}d
                        </span>
                        {u.charity && (
                          <span
                            style={{
                              color: "#888",
                              fontSize: 12,
                              fontFamily: FONT_BODY,
                            }}
                            className="truncate max-w-[160px]"
                          >
                            {u.charity}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={18} color="#555" style={{ flexShrink: 0 }} />
                  </div>

                  {/* ── Desktop (lg+): horizontal row ── */}
                  <div
                    className="hidden lg:flex items-center w-full"
                    style={{ gap: 12 }}
                  >
                    {/* User cell */}
                    <div
                      className="flex items-center gap-3 min-w-0"
                      style={{ flex: "0 0 220px" }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#e0e0e0",
                          fontFamily: FONT_HEADING,
                        }}
                      >
                        {(u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="truncate"
                          style={{
                            fontWeight: 600,
                            color: "#f0f0f0",
                            fontSize: 14,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          {u.firstName || u.lastName
                            ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                            : "Unnamed"}
                          {u.isAdmin && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: "rgba(234,179,8,0.1)",
                                color: "#fde68a",
                                border: "1px solid rgba(234,179,8,0.25)",
                              }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <div
                          className="truncate"
                          style={{ color: "#888", fontSize: 12, fontFamily: FONT_BODY }}
                        >
                          {u.email || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ flex: "0 0 110px" }}>
                      {statusPill(u.subscriptionStatus)}
                      {u.subscriptionType && (
                        <div
                          style={{
                            color: "#888",
                            fontSize: 11,
                            marginTop: 4,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          {u.subscriptionType}
                        </div>
                      )}
                    </div>

                    {/* Period */}
                    <div
                      style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        color: "#b0b0b0",
                        fontSize: 13,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {u.subscriptionStatus === "active" ||
                      u.subscriptionStatus === "trialing" ? (
                        <>
                          <div>{formatDate(u.currentPeriodEnd)}</div>
                          {u.currentPeriodStart && (
                            <div style={{ color: "#666", fontSize: 11 }}>
                              from {formatDate(u.currentPeriodStart)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#555" }}>—</span>
                      )}
                    </div>

                    {/* Streak */}
                    <div
                      className="flex items-center gap-2"
                      style={{ flex: "0 0 90px", fontSize: 14 }}
                    >
                      <Flame size={14} color="#f97316" />
                      <span
                        style={{ fontWeight: 700, color: "#f0f0f0", fontFamily: FONT_BODY }}
                      >
                        {u.days_of_streak ?? 0}
                      </span>
                      <span style={{ color: "#666", fontSize: 12, fontFamily: FONT_BODY }}>
                        days
                      </span>
                    </div>

                    {/* Charity */}
                    <div
                      className="truncate"
                      style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        color: "#b0b0b0",
                        fontSize: 13,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {u.charity || <span style={{ color: "#555" }}>—</span>}
                    </div>

                    {/* Chevron */}
                    <div style={{ flex: "0 0 20px", display: "flex", justifyContent: "flex-end" }}>
                      <ChevronRight size={18} color="#666" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
}
