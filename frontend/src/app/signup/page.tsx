"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { register } from "@/store/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { loading } = useSelector((s: RootState) => s.auth);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">TalentAI</span>
        </div>

        <div className="rounded-2xl p-8 bg-white border border-gray-200 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-500 mb-6">
            Start managing your hiring pipeline
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "Jane Recruiter" },
              { label: "Email", key: "email", type: "email", placeholder: "you@company.com" },
              { label: "Password", key: "password", type: "password", placeholder: "Min. 8 characters" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  required
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
