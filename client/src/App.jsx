// frontend/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

/* PUBLIC */
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

/* USER */
import UserSlots from "./pages/UserSlots";
import Profile from "./pages/Profile";
import Entry from "./pages/Entry";
import Exit from "./pages/Exit";
import BookSlot from "./pages/BookSlot";

/* ADMIN */
import AddSlot from "./pages/AddSlot";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSlots from "./pages/AdmimSlots";
import AdminEmployees from "./pages/AdminEmployees";
import ReceiptHistory from "./pages/ReceiptHistory";
import AdminActiveShifts from "./pages/AdminActiveShifts";

/* ROUTE GUARDS */
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

/* EMPLOYEE */
import EmployeeDashboard from "./pages/EmployeeDashboard";

const App = () => {
  return (
    <>
      <Navbar />

      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ================= USER ================= */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/slots"
          element={
            <ProtectedRoute>
              <UserSlots />
            </ProtectedRoute>
          }
        />

        <Route
          path="/book-slot"
          element={
            <ProtectedRoute>
              <BookSlot />
            </ProtectedRoute>
          }
        />

        <Route
          path="/entry"
          element={
            <ProtectedRoute>
              <Entry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exit"
          element={
            <ProtectedRoute>
              <Exit />
            </ProtectedRoute>
          }
        />

        {/* ================= EMPLOYEE ================= */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN ================= */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/add-slot"
          element={
            <AdminRoute>
              <AddSlot />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/slots"
          element={
            <AdminRoute>
              <AdminSlots />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/employees"
          element={
            <AdminRoute>
              <AdminEmployees />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/receipts"
          element={
            <AdminRoute>
              <ReceiptHistory />
            </AdminRoute>
          }
        />

        {/* ✅ ACTIVE SHIFTS */}
        <Route
          path="/admin/shifts"
          element={
            <AdminRoute>
              <AdminActiveShifts />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
};

export default App;