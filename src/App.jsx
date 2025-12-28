import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import FieldMonitoring from "./components/FieldMonitoring";
import Detection from "./components/Detection";
import AlarmLog from "./components/AlarmLog";
import Fields from "./components/Fields";
import "./App.css";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router>
      <div className="bg-white min-h-screen">
        <Sidebar onToggle={setIsSidebarCollapsed} />
        <main 
          className={`transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? "ml-20" : "ml-64"
          }`}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/field-monitoring" element={<FieldMonitoring />} />
            <Route path="/detection" element={<Detection />} />
            <Route path="/alarm-log" element={<AlarmLog />} />
            <Route path="/fields" element={<Fields />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;