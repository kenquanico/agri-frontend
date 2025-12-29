import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import Logo from "../assets/AV-logo.PNG";
import SidebarIcon from "../assets/side-bar.svg";
import Fields from "../assets/fields.svg";
import Dashboard from "../assets/dashboard.svg";
import AlarmLog from "../assets/alarm-log.svg";
import FieldMonitoring from "../assets/monitoring.svg";
import Detection from "../assets/detection.svg";

export default function Sidebar({ onToggle }) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggle) onToggle(newState);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    window.location.reload();
  };

  const linkClass =
    "flex items-center px-4 py-2 rounded-lg text-[#479B6D] hover:bg-[#C8E6C9] transition-colors duration-200 relative overflow-hidden";
  const activeClass = "bg-[#C8E6C9] font-bold";

  return (
    <>
      <aside
        className={`bg-white fixed inset-y-0 left-0 border-r border-gray-200 transition-all duration-300 ease-in-out z-40 ${
          isCollapsed ? "w-21" : "w-64"
        }`}
      >
        <div
          className={`flex items-center mr-5 ml-5 p-4 transition-all duration-300 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <img
            src={Logo}
            className={`h-8 w-auto transition-all duration-0 ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
            alt="Logo"
          />
          <button
            onClick={handleToggle}
            className="h-6 w-6 flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95"
            aria-label="Toggle sidebar"
          >
            <img
              src={SidebarIcon}
              className={`h-full w-full transition-transform duration-500 ${
                isCollapsed ? "rotate-180" : "rotate-0"
              }`}
              alt="Toggle"
            />
          </button>
        </div>

        <nav className="mt-5 px-4 space-y-2 flex-1">
          <NavLink
            to="/"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
            title={isCollapsed ? "Dashboard" : ""}
          >
            <div className="flex items-center justify-center w-5">
              <img src={Dashboard} className="h-5 w-5 flex-shrink-0" alt="Dashboard" />
            </div>
            <span
              className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}
            >
              Dashboard
            </span>
          </NavLink>

          <NavLink
            to="/field-monitoring"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
            title={isCollapsed ? "Field Monitoring" : ""}
          >
            <div className="flex items-center justify-center w-5">
              <img src={FieldMonitoring} className="h-5 w-5 flex-shrink-0" alt="Field Monitoring" />
            </div>
            <span
              className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}
            >
              Field Monitoring
            </span>
          </NavLink>

          <NavLink
            to="/detection"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
            title={isCollapsed ? "Detection" : ""}
          >
            <div className="flex items-center justify-center w-5">
              <img src={Detection} className="h-5 w-5 flex-shrink-0" alt="Detection" />
            </div>
            <span
              className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}
            >
              Detection
            </span>
          </NavLink>

          <NavLink
            to="/alarm-log"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
            title={isCollapsed ? "Alarm Log" : ""}
          >
            <div className="flex items-center justify-center w-5">
              <img src={AlarmLog} className="h-5 w-5 flex-shrink-0" alt="Alarm Log" />
            </div>
            <span
              className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}
            >
              Alarm Log
            </span>
          </NavLink>

          <NavLink
            to="/fields"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
            title={isCollapsed ? "Fields" : ""}
          >
            <div className="flex items-center justify-center w-5">
              <img src={Fields} className="h-5 w-5 flex-shrink-0" alt="Fields" />
            </div>
            <span
              className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}
            >
              Fields
            </span>
          </NavLink>
        </nav>

        {/* Logout Button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`${linkClass} text-red-600 hover:bg-red-50 w-full`}
            title={isCollapsed ? "Logout" : ""}
          >
            <div className="flex items-center justify-center w-5">
              <LogOut className="h-5 w-5 flex-shrink-0" />
            </div>
            <span
              className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
            <h2 className="text-lg font-semibold mb-4">Confirm Logout</h2>
            <p className="mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
