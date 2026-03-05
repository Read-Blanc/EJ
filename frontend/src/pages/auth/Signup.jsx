// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { Mail, Lock, Eye, EyeOff, User, GraduationCap, Briefcase } from 'lucide-react';
// import { useAuth } from '../../context/AuthContext';
// import { Button } from '../../components/ui/Button';
// import { Input } from '../../components/ui/Input';
// import { toast } from 'sonner';

// export default function SignupPage() {
//   const navigate = useNavigate();
//   const { signup, isAuthenticated, user } = useAuth();

//   const [formData, setFormData] = useState({
//     email: '',
//     username: '',
//     password: '',
//     confirmPassword: '',
//     full_name: '',
//     role: 'student',
//     student_id: '',
//     terms_accepted: false,
//   });

//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [loading, setLoading] = useState(false);

//   // Redirect if already logged in
//   if (isAuthenticated && user) {
//     const path = user.role === 'student' ? '/student/dashboard' : '/lecturer/dashboard';
//     navigate(path, { replace: true });
//     return null;
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Validation
//     if (formData.password !== formData.confirmPassword) {
//       toast.error('Passwords do not match');
//       return;
//     }

//     if (formData.password.length < 8) {
//       toast.error('Password must be at least 8 characters');
//       return;
//     }

//     if (!formData.terms_accepted) {
//       toast.error('Please accept the terms and conditions');
//       return;
//     }

//     setLoading(true);

//     try {
//       const userData = {
//         email: formData.email,
//         username: formData.username,
//         password: formData.password,
//         full_name: formData.full_name,
//         role: formData.role,
//         student_id: formData.student_id || null,
//       };

//       const response = await signup(userData);

//       toast.success('Account created successfully! 🎉');

//       // Navigate based on role
//       const path = response.user.role === 'student'
//         ? '/student/dashboard'
//         : '/lecturer/dashboard';
//       navigate(path, { replace: true });

//     } catch (error) {
//       const message = error.response?.data?.detail || 'Failed to create account';
//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === 'checkbox' ? checked : value,
//     }));
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
//       <div className="w-full max-w-md">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent mb-2">
//             EvalAI
//           </h1>
//           <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
//           <p className="mt-2 text-sm text-gray-600">
//             Start your journey with AI-powered assessments
//           </p>
//         </div>

//         {/* Signup form */}
//         <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
//           {/* Role selection */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               I am a
//             </label>
//             <div className="grid grid-cols-2 gap-3">
//               <button
//                 type="button"
//                 onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
//                 className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
//                   formData.role === 'student'
//                     ? 'border-brand-600 bg-brand-50 text-brand-700'
//                     : 'border-gray-200 hover:border-gray-300'
//                 }`}
//               >
//                 <GraduationCap className="w-5 h-5" />
//                 <span className="font-medium">Student</span>
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setFormData(prev => ({ ...prev, role: 'lecturer' }))}
//                 className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
//                   formData.role === 'lecturer'
//                     ? 'border-brand-600 bg-brand-50 text-brand-700'
//                     : 'border-gray-200 hover:border-gray-300'
//                 }`}
//               >
//                 <Briefcase className="w-5 h-5" />
//                 <span className="font-medium">Lecturer</span>
//               </button>
//             </div>
//           </div>

//           {/* Full name */}
//           <Input
//             label="Full name"
//             type="text"
//             name="full_name"
//             value={formData.full_name}
//             onChange={handleChange}
//             icon={User}
//             placeholder="John Doe"
//             required
//           />

//           {/* Email */}
//           <Input
//             label="Email address"
//             type="email"
//             name="email"
//             value={formData.email}
//             onChange={handleChange}
//             icon={Mail}
//             placeholder="you@example.com"
//             required
//             autoComplete="email"
//           />

//           {/* Username */}
//           <Input
//             label="Username"
//             type="text"
//             name="username"
//             value={formData.username}
//             onChange={handleChange}
//             icon={User}
//             placeholder="johndoe"
//             required
//             autoComplete="username"
//           />

//           {/* Student ID (if student) */}
//           {formData.role === 'student' && (
//             <Input
//               label="Student ID (optional)"
//               type="text"
//               name="student_id"
//               value={formData.student_id}
//               onChange={handleChange}
//               placeholder="S12345"
//             />
//           )}

//           {/* Password */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Password
//             </label>
//             <div className="relative">
//               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                 <Lock className="h-5 w-5 text-gray-400" />
//               </div>
//               <input
//                 type={showPassword ? 'text' : 'password'}
//                 name="password"
//                 value={formData.password}
//                 onChange={handleChange}
//                 className="block w-full pl-10 pr-10 rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
//                 placeholder="••••••••"
//                 required
//                 autoComplete="new-password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute inset-y-0 right-0 pr-3 flex items-center"
//               >
//                 {showPassword ? (
//                   <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                 ) : (
//                   <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                 )}
//               </button>
//             </div>
//             <p className="mt-1 text-xs text-gray-500">
//               At least 8 characters
//             </p>
//           </div>

//           {/* Confirm Password */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Confirm password
//             </label>
//             <div className="relative">
//               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                 <Lock className="h-5 w-5 text-gray-400" />
//               </div>
//               <input
//                 type={showConfirmPassword ? 'text' : 'password'}
//                 name="confirmPassword"
//                 value={formData.confirmPassword}
//                 onChange={handleChange}
//                 className="block w-full pl-10 pr-10 rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
//                 placeholder="••••••••"
//                 required
//                 autoComplete="new-password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                 className="absolute inset-y-0 right-0 pr-3 flex items-center"
//               >
//                 {showConfirmPassword ? (
//                   <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                 ) : (
//                   <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Terms */}
//           <label className="flex items-start">
//             <input
//               type="checkbox"
//               name="terms_accepted"
//               checked={formData.terms_accepted}
//               onChange={handleChange}
//               className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded mt-0.5"
//             />
//             <span className="ml-2 text-sm text-gray-700">
//               I agree to the{' '}
//               <a href="#" className="text-brand-600 hover:text-brand-500">
//                 Terms and Conditions
//               </a>{' '}
//               and{' '}
//               <a href="#" className="text-brand-600 hover:text-brand-500">
//                 Privacy Policy
//               </a>
//             </span>
//           </label>

//           {/* Submit button */}
//           <Button
//             type="submit"
//             variant="primary"
//             className="w-full"
//             loading={loading}
//           >
//             Create account
//           </Button>
//         </form>

//         {/* Sign in link */}
//         <p className="mt-6 text-center text-sm text-gray-600">
//           Already have an account?{' '}
//           <Link
//             to="/login"
//             className="font-medium text-brand-600 hover:text-brand-500"
//           >
//             Sign in
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// }

// src/pages/auth/SignupPage.jsx
// Modern multi-step signup — clean, minimal, confident

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Mail,
  Lock,
  User,
  Hash,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

const STEP_COUNT = 3;

export default function Signup() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, user } = useAuth();
  const hasRedirected = useRef(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    role: "",
    full_name: "",
    email: "",
    username: "",
    student_id: "",
    password: "",
    confirmPassword: "",
  });

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  // Validation per step
  const canAdvance = () => {
    if (step === 1) return !!form.role;
    if (step === 2)
      return (
        form.full_name.trim() &&
        form.email.includes("@") &&
        form.username.trim().length >= 3
      );
    if (step === 3)
      return (
        form.password.length >= 8 && form.password === form.confirmPassword
      );
    return false;
  };

  const next = () => {
    if (canAdvance()) setStep((s) => Math.min(s + 1, STEP_COUNT));
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate(
        user.role === "student" ? "/student/dashboard" : "/lecturer/dashboard",
        { replace: true },
      );
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async () => {
  setLoading(true);
  try {
    const response = await signup({ ...form });
    toast.success('Account created! Welcome 🎉');
    hasRedirected.current = true;
    const path = response.user.role === 'student' ? '/student/dashboard' : '/lecturer/dashboard';
    navigate(path, { replace: true });
  } catch (error) {
    toast.error(error?.response?.data?.detail || 'Failed to create account');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#fafaf9] flex">
      {/* Left brand strip */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-gray-950 flex-col justify-between p-10 relative overflow-hidden">
        {/* subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              EvalAI
            </span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            AI grading that understands meaning, not just keywords.
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Designed for universities that value fair, consistent, and instant
            assessment feedback.
          </p>
        </div>

        {/* Step indicator on left side */}
        <div className="relative z-10 space-y-3">
          {["Choose your role", "Your details", "Set a password"].map(
            (label, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-opacity duration-300 ${step > i + 1 ? "opacity-40" : step === i + 1 ? "opacity-100" : "opacity-30"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-brand-600 text-white" : "border border-gray-600 text-gray-600"}`}
                >
                  {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-sm ${step === i + 1 ? "text-white font-medium" : "text-gray-500"}`}
                >
                  {label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">EvalAI</span>
          </div>

          {/* Mobile step dots */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-brand-600" : i < step ? "w-4 bg-brand-300" : "w-4 bg-gray-200"}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Role */}
              {step === 1 && (
                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">
                    Step 1 of 3
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    I am joining as…
                  </h1>
                  <p className="text-gray-500 text-sm mb-8">
                    Your role determines what features you'll see.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        value: "student",
                        Icon: GraduationCap,
                        title: "Student",
                        sub: "Take assessments, view feedback & track progress",
                      },
                      {
                        value: "lecturer",
                        Icon: Briefcase,
                        title: "Lecturer",
                        sub: "Create assessments, grade submissions & view analytics",
                      },
                      // eslint-disable-next-line no-unused-vars
                    ].map(({ value, Icon, title, sub }) => (
                      <button
                        key={value}
                        onClick={() => set("role", value)}
                        className={`w-full flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                          form.role === value
                            ? "border-brand-600 bg-brand-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${form.role === value ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p
                            className={`font-semibold ${form.role === value ? "text-brand-700" : "text-gray-900"}`}
                          >
                            {title}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
                        </div>
                        {form.role === value && (
                          <div className="ml-auto flex-shrink-0 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {step === 2 && (
                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">
                    Step 2 of 3
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Your details
                  </h1>
                  <p className="text-gray-500 text-sm mb-8">
                    Tell us a bit about yourself.
                  </p>

                  <div className="space-y-4">
                    <Field
                      label="Full Name"
                      icon={<User className="w-4 h-4" />}
                    >
                      <input
                        name="full_name"
                        value={form.full_name}
                        onChange={handle}
                        placeholder="e.g. Alice Johnson"
                        className={inputCls}
                        autoFocus
                      />
                    </Field>
                    <Field
                      label="Email Address"
                      icon={<Mail className="w-4 h-4" />}
                    >
                      <input
                        name="email"
                        value={form.email}
                        onChange={handle}
                        type="email"
                        placeholder="you@university.edu"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Username" icon={<User className="w-4 h-4" />}>
                      <input
                        name="username"
                        value={form.username}
                        onChange={handle}
                        placeholder="alicejohnson"
                        className={inputCls}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Minimum 3 characters, used for your public profile.
                      </p>
                    </Field>
                    {form.role === "student" && (
                      <Field
                        label="Student ID (optional)"
                        icon={<Hash className="w-4 h-4" />}
                      >
                        <input
                          name="student_id"
                          value={form.student_id}
                          onChange={handle}
                          placeholder="e.g. S2021001"
                          className={inputCls}
                        />
                      </Field>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Password */}
              {step === 3 && (
                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">
                    Step 3 of 3
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Secure your account
                  </h1>
                  <p className="text-gray-500 text-sm mb-8">
                    Choose a strong password to protect your account.
                  </p>

                  <div className="space-y-4">
                    <Field label="Password" icon={<Lock className="w-4 h-4" />}>
                      <div className="relative">
                        <input
                          name="password"
                          value={form.password}
                          onChange={handle}
                          type={showPw ? "text" : "password"}
                          placeholder="At least 8 characters"
                          className={`${inputCls} pr-10`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPw ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {/* Strength bar */}
                      {form.password && (
                        <StrengthBar password={form.password} />
                      )}
                    </Field>

                    <Field
                      label="Confirm Password"
                      icon={<Lock className="w-4 h-4" />}
                    >
                      <input
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handle}
                        type="password"
                        placeholder="Repeat your password"
                        className={`${inputCls} ${form.confirmPassword && form.confirmPassword !== form.password ? "border-red-300" : ""}`}
                      />
                      {form.confirmPassword &&
                        form.confirmPassword !== form.password && (
                          <p className="text-xs text-red-500 mt-1">
                            Passwords don't match
                          </p>
                        )}
                    </Field>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-gray-100 rounded-xl text-sm space-y-1.5">
                    <p className="font-medium text-gray-700 mb-2">
                      Account summary
                    </p>
                    <p className="text-gray-500">
                      Role:{" "}
                      <span className="font-medium text-gray-800 capitalize">
                        {form.role}
                      </span>
                    </p>
                    <p className="text-gray-500">
                      Name:{" "}
                      <span className="font-medium text-gray-800">
                        {form.full_name}
                      </span>
                    </p>
                    <p className="text-gray-500">
                      Email:{" "}
                      <span className="font-medium text-gray-800">
                        {form.email}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={back}
                className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step < STEP_COUNT ? (
              <button
                onClick={next}
                disabled={!canAdvance()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canAdvance() || loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                {loading ? (
                  "Creating account…"
                ) : (
                  <>
                    Create Account <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function StrengthBar({ password }) {
  let s = 0;
  if (password.length >= 8) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-500",
  ];
  const textColors = [
    "",
    "text-red-500",
    "text-orange-500",
    "text-yellow-600",
    "text-green-600",
  ];
  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors duration-300 ${i <= s ? colors[s] : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className={`text-xs mt-1 font-medium ${textColors[s]}`}>{labels[s]}</p>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white transition-all placeholder-gray-400";

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
