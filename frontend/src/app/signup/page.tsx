"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { register } from "@/store/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";

export default function SignupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { loading } = useSelector((s: RootState) => s.auth);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }
    try {
      await dispatch(register(form)).unwrap();
      toast.success("Account created!");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Main Content - 50/50 Split */}
      <div className="flex-1 flex w-full">
        {/* Left Side - Blue Panel */}
        <div className="hidden lg:flex w-1/2 bg-blue-600 relative flex-col justify-center px-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded bg-blue-500 flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-white block">TalentAI</span>
              <span className="text-[10px] text-blue-200 tracking-widest uppercase">Enterprise Hiring Platform</span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Operator Registration</h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Create your account to access enterprise candidate screening.
            </p>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-blue-100">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span>Instant Setup</span>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              <Shield className="w-4 h-4" />
              <span>Verified</span>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="w-1/2 flex items-center justify-center px-8 bg-white">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 mb-10 lg:hidden">
              <div className="w-12 h-12 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 block">TalentAI</span>
                <span className="text-[9px] text-gray-500 tracking-widest uppercase">Registration Terminal</span>
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-[#e2e8f0]" />
                <span className="text-[9px] font-bold text-[#64748b] tracking-widest px-3">NEW OPERATOR REGISTRATION</span>
                <div className="h-px flex-1 bg-[#e2e8f0]" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[#64748b] tracking-wider uppercase mb-2">
                  Full Name
                </label>
                <div className="border border-[#cbd5e1] rounded-sm overflow-hidden">
                  <div className="px-2 py-1 bg-[#f1f5f9] border-b border-[#e2e8f0]">
                    <span className="text-[9px] font-bold text-[#94a3b8] tracking-wider">OPERATOR NAME</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-white border-0 outline-none focus:bg-[#f8fafc] transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#64748b] tracking-wider uppercase mb-2">
                  Email Address
                </label>
                <div className="border border-[#cbd5e1] rounded-sm overflow-hidden">
                  <div className="px-2 py-1 bg-[#f1f5f9] border-b border-[#e2e8f0]">
                    <span className="text-[9px] font-bold text-[#94a3b8] tracking-wider">OPERATOR ID</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.com"
                    className="w-full px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-white border-0 outline-none focus:bg-[#f8fafc] transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#64748b] tracking-wider uppercase mb-2">
                  Password
                </label>
                <div className="border border-[#cbd5e1] rounded-sm overflow-hidden">
                  <div className="px-2 py-1 bg-[#f1f5f9] border-b border-[#e2e8f0]">
                    <span className="text-[9px] font-bold text-[#94a3b8] tracking-wider">ACCESS KEY</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-white border-0 outline-none focus:bg-[#f8fafc] transition-colors font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold tracking-widest uppercase transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> PROVISIONING...</>
                ) : (
                  <>PROVISION ACCOUNT</>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[#e2e8f0]" />
                <span className="text-[9px] text-[#94a3b8]">EXISTING OPERATOR</span>
                <div className="h-px flex-1 bg-[#e2e8f0]" />
              </div>
              <div className="mt-4 text-center">
                <Link href="/login" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 tracking-wider uppercase">
                  Access Terminal →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Footer Bar */}
      <div className="h-7 bg-blue-600 border-t border-blue-500 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-[9px] font-mono text-blue-200">SYS: ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-2.5 h-2.5 text-blue-300" />
            <span className="text-[9px] font-mono text-blue-200">REG: OPEN</span>
          </div>
        </div>
        <div className="flex-1" />
        <span className="text-[9px] font-mono text-blue-300">NEW OPERATOR REGISTRATION</span>
      </div>
    </div>
  );
}
