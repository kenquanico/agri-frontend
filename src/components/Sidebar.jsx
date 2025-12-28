    import { useState } from "react";
    import { NavLink } from "react-router-dom";
    import Logo from "../assets/AV-logo.PNG";
    import SidebarIcon from "../assets/side-bar.svg";
    import Fields from "../assets/fields.svg";
    import Dashboard from "../assets/dashboard.svg";
    import AlarmLog from "../assets/alarm-log.svg";
    import FieldMonitoring from "../assets/monitoring.svg";
    import Detection from "../assets/detection.svg";

    export default function Sidebar({ onToggle }) {
      const [isCollapsed, setIsCollapsed] = useState(false);
      
      const handleToggle = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        if (onToggle) onToggle(newState);
      };
      
      const linkClass = "flex items-center px-4 py-2 rounded-lg text-[#479B6D] hover:bg-[#C8E6C9] transition-colors duration-200 relative overflow-hidden";
      const activeClass = "bg-[#C8E6C9] font-bold";

      return (
        <aside 
          className={`bg-white fixed inset-y-0 left-0 border-r border-gray-200 transition-all duration-300 ease-in-out z-40 ${
            isCollapsed ? "w-21" : "w-64"
          }`}
        >
          <div className={`flex items-center mr-5 ml-5 p-4 transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-between"}`}>
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
                className={`h-full w-ful transition-transform duration-500 ${
                  isCollapsed ? "rotate-180" : "rotate-0"
                }`}
                alt="Toggle"
              />
            </button>
          </div>
          
          <nav className="mt-5 px-4 space-y-2">
            <NavLink 
              to="/" 
              className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
              title={isCollapsed ? "Dashboard" : ""}
            >
              <div className="flex items-center justify-center w-5">
                <img src={Dashboard} className="h-5 w-5 flex-shrink-0" alt="Dashboard" />
              </div>
              <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}>
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
              <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}>
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
              <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}>
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
              <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}>
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
              <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
              }`}>
                Fields
              </span>
            </NavLink>
          </nav>
        </aside>
      );
    }