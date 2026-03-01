import { useNavigate, useLocation } from "react-router-dom";
import {ArrowLeft, ArrowRight, ChevronLeft, ChevronRight} from "lucide-react";
import SidebarIcon from "../assets/side-bar.svg";

const routeLabels = {
    "/dashboard":        "Dashboard",
    "/field-monitoring": "Field Monitoring",
    "/detection":        "Detection",
    "/alarm-log":        "Alarm Log",
    "/fields":           "Fields",
    "/settings":         "Settings",
};

export default function Navbar({ isCollapsed, onToggle }) {
    const navigate  = useNavigate();
    const location  = useLocation();

    const label = routeLabels[location.pathname] ?? "AgriVision";

    return (
        <header className="fixed top-0 right-0 left-0 z-30 h-14 bg-white border-b border-gray-100 flex items-center"
                style={{ paddingLeft: isCollapsed ? "72px" : "240px", transition: "padding-left 0.3s ease" }}>
            <div className="flex items-center gap-1 px-4 w-full">

                {/* Sidebar toggle */}
                <button
                    onClick={() => onToggle(!isCollapsed)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    aria-label="Toggle sidebar"
                >
                    <img
                        src={SidebarIcon}
                        className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : "rotate-0"}`}
                        alt="Toggle"
                    />
                </button>

                {/* Divider */}

                {/* Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    aria-label="Go back"
                >
                    <ArrowLeft size={16} strokeWidth={1.75} />
                </button>

                {/* Forward */}
                <button
                    onClick={() => navigate(1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    aria-label="Go forward"
                >
                    <ArrowRight size={16} strokeWidth={1.75}/>
                </button>

                {/* Divider */}

                {/* Current location */}
                <span className="text-sm font-semibold text-gray-700 tracking-tight">{label}</span>
            </div>
        </header>
    );
}