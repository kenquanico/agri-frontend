// src/App.jsx
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import FieldMonitoring from "./components/FieldMonitoring";
import Detection from "./components/Detection";
import AlarmLog from "./components/AlarmLog";
import Fields from "./components/Fields";
import Settings from "./components/Settings";
import Register from "./components/Register";
import Login from "./components/Login";
import "./App.css";

const MainLayout = ({ children, isCollapsed, onToggle }) => (
    <div className="bg-white min-h-screen">
        <Sidebar isCollapsed={isCollapsed} onToggle={onToggle} />
        <main className={`transition-all duration-300 ease-in-out ${isCollapsed ? "ml-20" : "ml-64"}`}>
            {children}
        </main>
    </div>
);

// ✅ Redirects to /login if not authenticated
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const withLayout = (Component) => (
        <ProtectedRoute>
            <MainLayout isCollapsed={isSidebarCollapsed} onToggle={setIsSidebarCollapsed}>
                <Component />
            </MainLayout>
        </ProtectedRoute>
    );

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={withLayout(Dashboard)} />
            <Route path="/field-monitoring" element={withLayout(FieldMonitoring)} />
            <Route path="/detection" element={withLayout(Detection)} />
            <Route path="/alarm-log" element={withLayout(AlarmLog)} />
            <Route path="/fields" element={withLayout(Fields)} />
            <Route path="/settings" element={withLayout(Settings)} />

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;