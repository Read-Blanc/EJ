import { useState, useContext, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { AuthContext } from "../context/AuthContext";

// ── Reusable toggle switch ────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${on ? "bg-gray-900" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Section({ title, desc, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="text-sm font-bold text-gray-900">{title}</div>
        {desc && <div className="text-xs text-gray-400 mt-0.5">{desc}</div>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, setUser, logout } = useContext(AuthContext);
  const isLecturer = user?.role === "lecturer";

  // ── Profile ────────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password ───────────────────────────────────────────────────────────────
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // ── Notifications — keys differ by role ───────────────────────────────────
  const defaultNotifs = isLecturer
    ? { new_submission: true, graded_override: false, reminders: true }
    : { graded: true, new_assessment: true, reminders: false };
  const [notifs, setNotifs] = useState(defaultNotifs);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // ── Appearance ────────────────────────────────────────────────────────────
  const [appearance, setAppearance] = useState({
    compactMode: false,
    showScoreColors: true,
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ msg: "", err: false });
  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast({ msg: "", err: false }), 3500);
  };

  // ── Load profile prefs on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name, notification_prefs, appearance_prefs")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
        if (data?.notification_prefs)
          setNotifs((p) => ({ ...p, ...data.notification_prefs }));
        if (data?.appearance_prefs)
          setAppearance((p) => ({ ...p, ...data.appearance_prefs }));
      });
  }, [user?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast("Full name is required.", true);
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      showToast("Failed to update profile.", true);
      return;
    }
    setUser((prev) => ({ ...prev, fullName: fullName.trim() }));
    showToast("Profile updated.");
  };

  const handleChangePwd = async () => {
    if (pwdNew.length < 8) {
      showToast("Password must be at least 8 characters.", true);
      return;
    }
    if (pwdNew !== pwdConfirm) {
      showToast("Passwords do not match.", true);
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwdNew });
    setSavingPwd(false);
    if (error) {
      showToast(error.message ?? "Failed to change password.", true);
      return;
    }
    setPwdNew("");
    setPwdConfirm("");
    showToast("Password changed successfully.");
  };

  const handleSaveNotifs = async () => {
    setSavingNotifs(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: notifs })
      .eq("id", user.id);
    setSavingNotifs(false);
    if (error) {
      showToast("Failed to save preferences.", true);
      return;
    }
    showToast("Notification preferences saved.");
  };

  const handleSaveAppearance = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ appearance_prefs: appearance })
      .eq("id", user.id);
    if (error) {
      showToast("Failed to save appearance settings.", true);
      return;
    }
    showToast("Appearance settings saved.");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    if (
      !window.confirm(
        "Are you absolutely sure? All your data will be permanently lost.",
      )
    )
      return;
    await supabase.auth.signOut();
    logout?.();
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const initials = (user?.fullName || user?.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const pwdOk = pwdNew.length >= 8 && pwdNew === pwdConfirm;
  const strength = [
    pwdNew.length >= 8,
    /[A-Z]/.test(pwdNew),
    /[0-9]/.test(pwdNew),
    /[^A-Za-z0-9]/.test(pwdNew),
  ];

  // Notification rows keyed by role
  const notifRows = isLecturer
    ? [
        {
          key: "new_submission",
          label: "New submission",
          desc: "Notify me when a student submits an assessment.",
        },
        {
          key: "graded_override",
          label: "Grading overrides",
          desc: "Notify me when an AI grade is manually changed.",
        },
        {
          key: "reminders",
          label: "Deadline reminders",
          desc: "Remind me when assessments are closing soon.",
        },
      ]
    : [
        {
          key: "graded",
          label: "Assessment graded",
          desc: "Notify me when my submission has been graded.",
        },
        {
          key: "new_assessment",
          label: "New assessment",
          desc: "Notify me when a new assessment is available.",
        },
        {
          key: "reminders",
          label: "Deadline reminders",
          desc: "Remind me before an assessment closes.",
        },
      ];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center sticky top-0 z-10">
        <div className="text-[18px] font-bold text-gray-900">Settings</div>
      </div>

      <div className="p-6 max-w-2xl space-y-5">
        {/* ── Account card ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-900 text-white font-bold text-base flex items-center justify-center shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 truncate">
              {user?.fullName || "No name set"}
            </div>
            <div className="text-sm text-gray-400 truncate">{user?.email}</div>
            <span className="inline-block mt-1 text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {isLecturer ? "Lecturer" : "Student"}
            </span>
          </div>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile" desc="Update your display name.">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Role
            </label>
            <input
              type="text"
              value={isLecturer ? "Lecturer" : "Student"}
              disabled
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          >
            {savingProfile ? "Saving…" : "Save Profile"}
          </button>
        </Section>

        {/* ── Password ── */}
        <Section title="Password" desc="Change your account password.">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wide font-semibold"
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
            {pwdNew && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {strength.map((met, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full ${met ? "bg-gray-900" : "bg-gray-200"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-3 text-[10px] text-gray-400">
                  {[
                    ["8+ chars", strength[0]],
                    ["Uppercase", strength[1]],
                    ["Number", strength[2]],
                    ["Symbol", strength[3]],
                  ].map(([label, met]) => (
                    <span
                      key={label}
                      className={met ? "text-gray-700 font-medium" : ""}
                    >
                      {met ? "✓" : "·"} {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Confirm Password
            </label>
            <input
              type={showPwd ? "text" : "password"}
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder="Repeat new password"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
            {pwdConfirm && pwdNew !== pwdConfirm && (
              <p className="text-xs text-gray-500 mt-1">
                Passwords do not match.
              </p>
            )}
          </div>
          <button
            onClick={handleChangePwd}
            disabled={savingPwd || !pwdOk}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          >
            {savingPwd ? "Changing…" : "Change Password"}
          </button>
        </Section>

        {/* ── Notifications ── */}
        <Section
          title="Notifications"
          desc={`Control which notifications you receive as a ${isLecturer ? "lecturer" : "student"}.`}
        >
          {notifRows.map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-gray-800">{label}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
              <Toggle
                on={notifs[key] ?? false}
                onChange={(val) => setNotifs((p) => ({ ...p, [key]: val }))}
              />
            </div>
          ))}
          <button
            onClick={handleSaveNotifs}
            disabled={savingNotifs}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          >
            {savingNotifs ? "Saving…" : "Save Preferences"}
          </button>
        </Section>

        {/* ── Appearance ── */}
        <Section
          title="Appearance"
          desc="Customise how the interface looks for you."
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-800">
                Compact mode
              </div>
              <div className="text-xs text-gray-400">
                Reduce spacing in lists and tables for a denser view.
              </div>
            </div>
            <Toggle
              on={appearance.compactMode}
              onChange={(val) =>
                setAppearance((p) => ({ ...p, compactMode: val }))
              }
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-800">
                Score colour coding
              </div>
              <div className="text-xs text-gray-400">
                Show green / amber / red colours on scores throughout the app.
              </div>
            </div>
            <Toggle
              on={appearance.showScoreColors}
              onChange={(val) =>
                setAppearance((p) => ({ ...p, showScoreColors: val }))
              }
            />
          </div>
          <button
            onClick={handleSaveAppearance}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition"
          >
            Save Appearance
          </button>
        </Section>

        {/* ── Lecturer-only: Grading defaults ── */}
        {isLecturer && (
          <Section
            title="Grading Defaults"
            desc="Control default behaviour when grading submissions."
          >
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              AI grading runs automatically on submission. You can override any
              score manually in the Grading Queue. Future versions will allow
              setting per-assessment rubric weights here.
            </div>
          </Section>
        )}

        {/* ── Student-only: Privacy ── */}
        {!isLecturer && (
          <Section
            title="Privacy"
            desc="Control what your lecturers can see about your activity."
          >
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              Lecturers can see your submitted answers, scores, and submission
              timestamps. They cannot see your draft answers or activity outside
              of submitted assessments.
            </div>
          </Section>
        )}

        {/* ── Danger zone ── */}
        <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50">
            <div className="text-sm font-bold text-red-600">Danger Zone</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Irreversible actions. Proceed with caution.
            </div>
          </div>
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-800">
                Delete account
              </div>
              <div className="text-xs text-gray-400">
                Permanently remove your account and all associated data.
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 border border-red-200 text-sm font-semibold text-red-600 rounded-md hover:bg-red-50 transition shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium px-6 py-3 rounded-lg shadow-xl z-50 whitespace-nowrap ${
            toast.err ? "bg-red-600 text-white" : "bg-gray-900 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
