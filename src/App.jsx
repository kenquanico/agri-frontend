import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import FieldMonitoring from "./components/FieldMonitoring";
import Detection from "./components/Detection";
import AlarmLog from "./components/AlarmLog";
import Fields from "./components/Fields";
import Register from "./components/Register";
import Login from "./components/Login";
import "./App.css";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage for token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setIsAuthenticated(true);
  }, []);

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  // Main App Layout (with Sidebar)
  const MainLayout = ({ children }) => (
    <div className="bg-white min-h-screen">
      <Sidebar onToggle={setIsSidebarCollapsed} />
      <main
        className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );

  // Handle login from Login component
  const handleLogin = (token) => {
    localStorage.setItem("token", token);
    setIsAuthenticated(true);
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Register />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/field-monitoring"
          element={
            <ProtectedRoute>
              <MainLayout>
                <FieldMonitoring />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/detection"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Detection />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alarm-log"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AlarmLog />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fields"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Fields />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirect any unknown route */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
