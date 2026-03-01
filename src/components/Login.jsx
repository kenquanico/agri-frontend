import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import Logo from "../assets/AV-logo.PNG";
import api from "../api/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    if (loginError) setLoginError("");
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Enter a valid email address";
    if (!formData.password) newErrors.password = "Password is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setIsLoading(true);
    try {
      const { data, status } = await api.post('/api/login', formData);
      if (status === 200) {
        localStorage.setItem("user", JSON.stringify(data.user));
        login(data.token);
        navigate("/dashboard");
      } else {
        setLoginError(data?.message || "Login failed");
      }
    } catch (error) {
      setLoginError(error.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">

          {/* Brand */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 mb-4">
              <img
                  src={Logo}
                  alt="AgriVision Logo"
                  className="h-14 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-gray-400">Sign in to your account to continue</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-5">

            {/* Error Banner */}
            {loginError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all placeholder-gray-300 ${
                          errors.email ? "border-red-300 bg-red-50/30" : "border-gray-200"
                      }`}
                  />
                </div>
                {errors.email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                      {errors.email}
                    </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all placeholder-gray-300 ${
                          errors.password ? "border-red-300 bg-red-50/30" : "border-gray-200"
                      }`}
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-0.5"
                      tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                      {errors.password}
                    </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
                type="submit"
                onClick={handleSubmit}
                onKeyDown={e => {if (e.key === 'Enter') handleSubmit();}}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all shadow-sm shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isLoading ? "Signing in…" : "Sign in"}
            </button>

            {/* Divider + Register */}
            <div className="pt-1 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mt-4">
                Don't have an account?{" "}
                <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-green-600 hover:text-green-700 font-semibold transition-colors"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>

        </div>
      </div>
  );
}