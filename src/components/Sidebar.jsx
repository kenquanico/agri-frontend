import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon, X } from "lucide-react";
import Logo from "../assets/AV-logo.PNG";
import SidebarIcon from "../assets/side-bar.svg";
import Fields from "../assets/fields.svg";
import Dashboard from "../assets/dashboard.svg";
import AlarmLog from "../assets/alarm-log.svg";
import FieldMonitoring from "../assets/monitoring.svg";
import Detection from "../assets/detection.svg";

export default function Sidebar({ isCollapsed, onToggle }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleToggle = () => onToggle(!isCollapsed);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    window.location.reload();
  };

  const navItems = [
    { to: "/dashboard", icon: Dashboard, label: "Dashboard" },
    { to: "/field-monitoring", icon: FieldMonitoring, label: "Field Monitoring" },
    { to: "/detection", icon: Detection, label: "Detection" },
    { to: "/alarm-log", icon: AlarmLog, label: "Alarm Log" },
    { to: "/fields", icon: Fields, label: "Fields" },
  ];

  return (
      <>
        <aside
            className={`bg-white fixed inset-y-0 left-0 border-r border-gray-100 transition-all duration-300 ease-in-out z-40 flex flex-col ${
                isCollapsed ? "w-[72px]" : "w-60"
            }`}
        >
          {/* Logo Row */}
          <div className={`flex items-center h-16 px-4 border-b border-gray-100 ${isCollapsed ? "justify-center" : "justify-between"}`}>
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
              <img src={Logo} className="h-7 w-auto" alt="Logo" />
            </div>
            <button
                onClick={handleToggle}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Toggle sidebar"
            >
              <img
                  src={SidebarIcon}
                  className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : "rotate-0"}`}
                  alt="Toggle"
              />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    title={isCollapsed ? label : ""}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group relative ${
                            isActive
                                ? "bg-green-50 text-green-700"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                        }`
                    }
                >
                  {({ isActive }) => (
                      <>
                        <div className="flex items-center justify-center w-5 flex-shrink-0">
                          <img src={Icon} className={`h-5 w-5 transition-opacity ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-80"}`} alt={label} />
                        </div>
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                    {label}
                  </span>
                        {isActive && !isCollapsed && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                      </>
                  )}
                </NavLink>
            ))}

            {/* Settings */}
            <NavLink
                to="/settings"
                title={isCollapsed ? "Settings" : ""}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
                        isActive ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    }`
                }
            >
              {({ isActive }) => (
                  <>
                    <div className="flex items-center justify-center w-5 flex-shrink-0">
                      <SettingsIcon className={`h-5 w-5 transition-opacity ${isActive ? "opacity-100 text-green-700" : "opacity-60 group-hover:opacity-80"}`} />
                    </div>
                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                  Settings
                </span>
                    {isActive && !isCollapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </>
              )}
            </NavLink>
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4 border-t border-gray-100 pt-3">
            <button
                onClick={() => setShowLogoutModal(true)}
                title={isCollapsed ? "Logout" : ""}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
            >
              <div className="flex items-center justify-center w-5 flex-shrink-0">
                <LogOut className="h-4 w-4" />
              </div>
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
              Logout
            </span>
            </button>
          </div>
        </aside>

        {/* Logout Modal */}
        {showLogoutModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl shadow-black/10 border border-gray-100">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Sign out</h2>
                  <button
                      onClick={() => setShowLogoutModal(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-gray-500 mb-6">Are you sure you want to sign out of your account?</p>
                  <div className="flex gap-2">
                    <button
                        onClick={handleLogout}
                        className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all"
                    >
                      Sign out
                    </button>
                    <button
                        onClick={() => setShowLogoutModal(false)}
                        className="flex-1 bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}
      </>
  );
}