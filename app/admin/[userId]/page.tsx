"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Clock,
  Heart,
  Flame,
  CreditCard,
  Calendar,
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Hourglass,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const FONT_HEADING = "'OggText', 'Ogg', serif";
const FONT_BODY = "'Helvetica Neue', -apple-system, system-ui, sans-serif";

type SubmissionDay = {
  targetDate: string;
  dayOfWeek?: string;
  deadline?: string;
  status: string;
  submissionId?: string;
  submittedAt?: string;
};

type Challenge = {
  challengeId: string;
  userId: string;
  status: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  goalDescription?: string;
  why?: string;
  schedule?: string;
  timezone?: string;
  proofMethod?: string;
  submissionType?: string;
  plan?: string;
  scheduleDays?: string[];
  deadlineTime?: string;
  frequency?: string;
  submissionCalendar?: SubmissionDay[];
  totalSubmissions?: number;
  depositAmount?: number;
  charityContext?: string;
  createdAt?: string;
  updatedAt?: string;
};

type UserDetail = {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  timezone?: string;
  charity?: string;
  days_of_streak?: number;
  subscriptionStatus?: string | null;
  subscriptionType?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentChallengeId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SubmissionSummary = {
  verified: number;
  denied: number;
  missed: number;
  pending: number;
  processing: number;
  failed: number;
  doubleChecking: number;
  total: number;
};

type DetailResponse = {
  user: UserDetail;
  currentChallenge: Challenge | null;
  submissionSummary: SubmissionSummary;
  totalChallenges: number;
};

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
    completed: {
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.35)",
      color: "#86efac",
      label: "Completed",
    },
    failed: {
      bg: "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.30)",
      color: "#fca5a5",
      label: "Failed",
    },
    none: {
      bg: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.08)",
      color: "#888888",
      label: "No Sub",
    },
  };
  const c = config[s] || {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    color: "#888",
    label: s,
  };
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

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 8,
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "1.4px",
            textTransform: "uppercase",
            color: "#666",
            fontFamily: FONT_HEADING,
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div
          className="wrap-break-word"
          style={{
            fontSize: 14,
            color: "#e0e0e0",
            fontFamily: mono
              ? "ui-monospace, SFMono-Regular, Menlo, monospace"
              : FONT_BODY,
            wordBreak: "break-word",
          }}
        >
          {value || <span style={{ color: "#555" }}>—</span>}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#141414",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: 28,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: subtitle ? 4 : 22,
          }}
        >
          {icon && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e0e0e0",
              }}
            >
              {icon}
            </div>
          )}
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#f0f0f0",
              fontFamily: FONT_HEADING,
              letterSpacing: "-0.2px",
            }}
          >
            {title}
          </h3>
        </div>
        {subtitle && (
          <p
            style={{
              color: "#888",
              fontSize: 13,
              fontFamily: FONT_BODY,
              marginBottom: 22,
            }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function SubmissionStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 14,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle at top right, ${color}22, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          color,
        }}
      >
        {icon}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "1.3px",
            textTransform: "uppercase",
            fontFamily: FONT_HEADING,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#f0f0f0",
          fontFamily: FONT_HEADING,
          lineHeight: 1,
          position: "relative",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const { user: authUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const userId = params?.userId;

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.push(`/login?redirect=/admin/${userId}`);
      return;
    }
    if (userId) load();
  }, [authLoading, authUser, userId]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setForbidden(false);

      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.status === 401) {
        router.push(`/login?redirect=/admin/${userId}`);
        return;
      }
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load user detail");
      }

      const json = (await res.json()) as DetailResponse;
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
              fontFamily: FONT_BODY,
            }}
          >
            Your account does not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            backgroundColor: "#141414",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
          }}
        >
          <AlertCircle
            size={40}
            color="#fca5a5"
            style={{ margin: "0 auto 12px" }}
          />
          <p
            style={{
              color: "#e0e0e0",
              fontFamily: FONT_BODY,
              marginBottom: 20,
            }}
          >
            {error || "Unable to load user"}
          </p>
          <button
            onClick={() => router.push("/admin")}
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
            Back to users
          </button>
        </div>
      </div>
    );
  }

  const { user, currentChallenge, submissionSummary, totalChallenges } = data;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user";

  const goal =
    currentChallenge?.goal || currentChallenge?.goalDescription || null;

  const completionRate = (() => {
    const done = submissionSummary.verified;
    const totalDecided =
      submissionSummary.verified +
      submissionSummary.denied +
      submissionSummary.missed;
    if (totalDecided === 0) return null;
    return Math.round((done / totalDecided) * 100);
  })();

  return (
    <div className="min-h-screen bg-black pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => router.push("/admin")}
          className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Back to users
        </motion.button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex items-center gap-5">
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  backgroundColor: "#141414",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#f0f0f0",
                  fontFamily: FONT_HEADING,
                  flexShrink: 0,
                }}
              >
                {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1
                    style={{
                      fontSize: "clamp(26px, 4vw, 38px)",
                      fontWeight: 800,
                      color: "#f0f0f0",
                      fontFamily: FONT_HEADING,
                      letterSpacing: "-0.5px",
                      margin: 0,
                    }}
                  >
                    {fullName}
                  </h1>
                  {user.isAdmin && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "1.2px",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 6,
                        backgroundColor: "rgba(234,179,8,0.1)",
                        color: "#fde68a",
                        border: "1px solid rgba(234,179,8,0.25)",
                        fontFamily: FONT_BODY,
                      }}
                    >
                      Admin
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span
                    className="flex items-center gap-2"
                    style={{ color: "#888", fontSize: 14, fontFamily: FONT_BODY }}
                  >
                    <Mail size={14} />
                    {user.email || "—"}
                  </span>
                  {user.timezone && (
                    <span
                      className="flex items-center gap-2"
                      style={{
                        color: "#888",
                        fontSize: 14,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      <Clock size={14} />
                      {user.timezone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {statusPill(user.subscriptionStatus)}
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  backgroundColor: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.25)",
                }}
              >
                <Flame size={16} color="#f97316" />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f0f0f0",
                    fontFamily: FONT_HEADING,
                  }}
                >
                  {user.days_of_streak ?? 0}
                  <span
                    style={{
                      color: "#888",
                      fontSize: 12,
                      fontWeight: 500,
                      marginLeft: 4,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    day streak
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1 space-y-5"
          >
            <Panel title="Account" icon={<Mail size={18} />}>
              <InfoRow
                icon={<Mail size={14} />}
                label="Email"
                value={user.email}
              />
              <InfoRow
                icon={<Clock size={14} />}
                label="Timezone"
                value={user.timezone}
              />
              <InfoRow
                icon={<Heart size={14} color="#f472b6" />}
                label="Charity"
                value={user.charity}
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label="Joined"
                value={formatDate(user.createdAt)}
              />
              <InfoRow
                icon={<Sparkles size={14} />}
                label="User ID"
                value={user.userId}
                mono
              />
            </Panel>

            <Panel title="Subscription" icon={<CreditCard size={18} />}>
              <InfoRow
                icon={<CreditCard size={14} />}
                label="Status"
                value={statusPill(user.subscriptionStatus)}
              />
              {user.subscriptionType && (
                <InfoRow
                  icon={<Sparkles size={14} />}
                  label="Plan"
                  value={user.subscriptionType}
                />
              )}
              {user.subscriptionStatus === "active" ||
              user.subscriptionStatus === "trialing" ? (
                <>
                  <InfoRow
                    icon={<Calendar size={14} />}
                    label="Period Start"
                    value={formatDate(user.currentPeriodStart)}
                  />
                  <InfoRow
                    icon={<Calendar size={14} />}
                    label="Period End"
                    value={formatDate(user.currentPeriodEnd)}
                  />
                  {user.cancelAtPeriodEnd && (
                    <InfoRow
                      icon={<AlertTriangle size={14} color="#fde68a" />}
                      label="Cancels at period end"
                      value={
                        <span style={{ color: "#fde68a" }}>
                          Yes — will not renew
                        </span>
                      }
                    />
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: "14px 0",
                    color: "#666",
                    fontSize: 13,
                    fontFamily: FONT_BODY,
                  }}
                >
                  This user does not have an active or trialing subscription.
                </div>
              )}
              {user.stripeCustomerId && (
                <InfoRow
                  icon={<CreditCard size={14} />}
                  label="Stripe Customer"
                  value={user.stripeCustomerId}
                  mono
                />
              )}
            </Panel>

          </motion.div>

          {/* Right column */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-2 space-y-5"
          >
            {currentChallenge ? (
              <>
                <Panel title="Current Challenge" icon={<Target size={18} />}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 20,
                    }}
                  >
                    {statusPill(currentChallenge.status)}
                    {currentChallenge.frequency && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#b0b0b0",
                          fontFamily: FONT_BODY,
                        }}
                      >
                        {currentChallenge.frequency}
                      </span>
                    )}
                    {currentChallenge.submissionType && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#b0b0b0",
                          fontFamily: FONT_BODY,
                        }}
                      >
                        {currentChallenge.submissionType}
                      </span>
                    )}
                  </div>

                  {goal && (
                    <div
                      style={{
                        padding: 20,
                        borderRadius: 14,
                        backgroundColor: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "1.4px",
                          textTransform: "uppercase",
                          color: "#666",
                          fontFamily: FONT_HEADING,
                          marginBottom: 8,
                        }}
                      >
                        Goal
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          color: "#f0f0f0",
                          fontFamily: FONT_HEADING,
                          lineHeight: 1.4,
                          fontWeight: 700,
                        }}
                      >
                        {goal}
                      </div>
                      {currentChallenge.why && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "1.4px",
                              textTransform: "uppercase",
                              color: "#666",
                              fontFamily: FONT_HEADING,
                              marginBottom: 6,
                            }}
                          >
                            Why
                          </div>
                          <div
                            style={{
                              color: "#b0b0b0",
                              fontSize: 14,
                              fontFamily: FONT_BODY,
                              lineHeight: 1.5,
                            }}
                          >
                            {currentChallenge.why}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <InfoRow
                      icon={<Calendar size={14} />}
                      label="Start"
                      value={formatDate(currentChallenge.startDate)}
                    />
                    <InfoRow
                      icon={<Calendar size={14} />}
                      label="End"
                      value={formatDate(currentChallenge.endDate)}
                    />
                    <InfoRow
                      icon={<Clock size={14} />}
                      label="Schedule"
                      value={
                        currentChallenge.schedule ||
                        currentChallenge.scheduleDays?.join(", ")
                      }
                    />
                    <InfoRow
                      icon={<Clock size={14} />}
                      label="Deadline"
                      value={currentChallenge.deadlineTime}
                    />
                    <InfoRow
                      icon={<Sparkles size={14} />}
                      label="Proof Method"
                      value={currentChallenge.proofMethod}
                    />
                  </div>
                </Panel>

                <Panel
                  title="Submission Summary"
                  subtitle={
                    completionRate !== null
                      ? `${completionRate}% verified across ${
                          submissionSummary.verified +
                          submissionSummary.denied +
                          submissionSummary.missed
                        } evaluated submissions.`
                      : "No submissions have been evaluated yet."
                  }
                  icon={<CheckCircle2 size={18} />}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <SubmissionStatCard
                      label="Verified"
                      value={submissionSummary.verified}
                      icon={<CheckCircle2 size={14} />}
                      color="#22c55e"
                    />
                    <SubmissionStatCard
                      label="Denied"
                      value={submissionSummary.denied}
                      icon={<XCircle size={14} />}
                      color="#ef4444"
                    />
                    <SubmissionStatCard
                      label="Missed"
                      value={submissionSummary.missed}
                      icon={<AlertTriangle size={14} />}
                      color="#eab308"
                    />
                    <SubmissionStatCard
                      label="Pending"
                      value={submissionSummary.pending}
                      icon={<Hourglass size={14} />}
                      color="#a1a1aa"
                    />
                    <SubmissionStatCard
                      label="Processing"
                      value={
                        submissionSummary.processing +
                        submissionSummary.doubleChecking
                      }
                      icon={<Loader2 size={14} />}
                      color="#3b82f6"
                    />
                    <SubmissionStatCard
                      label="Total Days"
                      value={submissionSummary.total}
                      icon={<Calendar size={14} />}
                      color="#e0e0e0"
                    />
                  </div>

                  {/* Progress bar */}
                  {submissionSummary.total > 0 && (
                    <div style={{ marginTop: 22 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          fontSize: 11,
                          color: "#888",
                          fontFamily: FONT_BODY,
                          fontWeight: 600,
                          letterSpacing: "0.4px",
                        }}
                      >
                        <span>Distribution</span>
                        <span>
                          {submissionSummary.verified +
                            submissionSummary.denied +
                            submissionSummary.missed}
                          /{submissionSummary.total} evaluated
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          height: 8,
                          borderRadius: 999,
                          overflow: "hidden",
                          backgroundColor: "rgba(255,255,255,0.04)",
                        }}
                      >
                        {submissionSummary.verified > 0 && (
                          <div
                            style={{
                              flex: submissionSummary.verified,
                              backgroundColor: "#22c55e",
                            }}
                            title={`Verified: ${submissionSummary.verified}`}
                          />
                        )}
                        {submissionSummary.denied > 0 && (
                          <div
                            style={{
                              flex: submissionSummary.denied,
                              backgroundColor: "#ef4444",
                            }}
                            title={`Denied: ${submissionSummary.denied}`}
                          />
                        )}
                        {submissionSummary.missed > 0 && (
                          <div
                            style={{
                              flex: submissionSummary.missed,
                              backgroundColor: "#eab308",
                            }}
                            title={`Missed: ${submissionSummary.missed}`}
                          />
                        )}
                        {submissionSummary.pending > 0 && (
                          <div
                            style={{
                              flex: submissionSummary.pending,
                              backgroundColor: "#52525b",
                            }}
                            title={`Pending: ${submissionSummary.pending}`}
                          />
                        )}
                        {submissionSummary.processing +
                          submissionSummary.doubleChecking >
                          0 && (
                          <div
                            style={{
                              flex:
                                submissionSummary.processing +
                                submissionSummary.doubleChecking,
                              backgroundColor: "#3b82f6",
                            }}
                            title={`Processing: ${
                              submissionSummary.processing +
                              submissionSummary.doubleChecking
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </Panel>

                {/* Recent submissions */}
                {currentChallenge.submissionCalendar &&
                  currentChallenge.submissionCalendar.length > 0 && (
                    <Panel
                      title="Recent Submission Days"
                      subtitle="Most recent 12 evaluated submission days (pending excluded)."
                      icon={<Calendar size={18} />}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {[...currentChallenge.submissionCalendar]
                          .filter((d) => d.status !== "pending")
                          .sort((a, b) =>
                            (b.targetDate || "").localeCompare(a.targetDate || "")
                          )
                          .slice(0, 12)
                          .map((day) => {
                            const statusColors: Record<string, string> = {
                              verified: "#22c55e",
                              denied: "#ef4444",
                              missed: "#eab308",
                              pending: "#71717a",
                              processing: "#3b82f6",
                              failed: "#ef4444",
                              "double-checking": "#3b82f6",
                            };
                            const color =
                              statusColors[day.status] || "#71717a";
                            return (
                              <div
                                key={`${day.targetDate}-${day.submissionId || ""}`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "12px 16px",
                                  borderRadius: 10,
                                  backgroundColor: "rgba(255,255,255,0.02)",
                                  border: "1px solid rgba(255,255,255,0.04)",
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 999,
                                      backgroundColor: color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div>
                                    <div
                                      style={{
                                        color: "#f0f0f0",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        fontFamily: FONT_BODY,
                                      }}
                                    >
                                      {day.targetDate}
                                    </div>
                                    {day.dayOfWeek && (
                                      <div
                                        style={{
                                          color: "#666",
                                          fontSize: 12,
                                          fontFamily: FONT_BODY,
                                        }}
                                      >
                                        {day.dayOfWeek}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.8px",
                                    textTransform: "uppercase",
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    backgroundColor: `${color}1a`,
                                    color,
                                    border: `1px solid ${color}40`,
                                    fontFamily: FONT_BODY,
                                  }}
                                >
                                  {day.status}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </Panel>
                  )}
              </>
            ) : (
              <Panel title="Current Challenge" icon={<Target size={18} />}>
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#666",
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                  }}
                >
                  {totalChallenges > 0
                    ? "No current challenge set. This user has completed or paused their challenges."
                    : "This user has not started a challenge yet."}
                </div>
              </Panel>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
