// client/src/components/DemoFloatingBadge.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { resetDemoData, setDemoUserAdmin } from "@/demo/mockBackend";

export default function DemoFloatingBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const isAdmin = !!user && (user.roleId === 1 || user.role === "Admin");
  const onAdminPath = location.pathname.startsWith("/admin");

  const handleEnterAdmin = async () => {
    setDemoUserAdmin();
    await login({ username: "admin", password: "password123" });
    navigate("/admin/dashboard");
  };

  const handleGoPublic = () => {
    navigate("/");
  };

  return (
    <aside
      aria-label="Portfolio Demo Controls"
      className="fixed bottom-5 right-5 z-[9999] select-none font-sans"
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-neutral-900/95 hover:bg-neutral-900 text-amber-400 px-4 py-2.5 rounded-full shadow-2xl border border-amber-500/40 backdrop-blur-md transition-all duration-200 hover:scale-105 text-[13px] font-semibold tracking-wide cursor-pointer"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Demo</span>
          <span className="bg-amber-500/20 text-amber-300 text-[11px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
            {isAdmin ? "Admin" : "Visitor"}
          </span>
        </button>
      ) : (
        <div className="bg-neutral-950/95 text-white border border-neutral-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl w-[290px] transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-[14px] text-neutral-200">Museo Bulawan MIS</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white text-[13px] px-2 py-0.5 rounded-md hover:bg-neutral-800 transition"
              title="Minimize"
            >
              ✕
            </button>
          </div>

          <div className="my-3.5 space-y-2 text-[12px]">
            <div className="flex justify-between text-neutral-400">
              <span>Status:</span>
              <span className="text-emerald-400 font-medium">Interactive Demo Mode</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Current Role:</span>
              <span className="font-semibold text-neutral-200">
                {user ? `${user.role} (${user.fname})` : "Public Visitor"}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {!isAdmin ? (
              <button
                type="button"
                onClick={handleEnterAdmin}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium py-2.5 px-3 rounded-lg text-[13px] transition duration-150 flex items-center justify-center gap-2 shadow"
              >
                <span>⚡</span>
                <span>Switch to Admin Panel</span>
              </button>
            ) : (
              <>
                {!onAdminPath ? (
                  <button
                    type="button"
                    onClick={() => navigate("/admin/dashboard")}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-medium py-2.5 px-3 rounded-lg text-[13px] transition duration-150 flex items-center justify-center gap-2"
                  >
                    <span>🏛️</span>
                    <span>Go to Admin Dashboard</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoPublic}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium py-2.5 px-3 rounded-lg text-[13px] transition duration-150 flex items-center justify-center gap-2"
                  >
                    <span>🌐</span>
                    <span>View Public Museum Portal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white py-2 px-3 rounded-lg text-[12px] transition duration-150"
                >
                  Log out of Admin
                </button>
              </>
            )}

            <button
              type="button"
              onClick={resetDemoData}
              className="w-full text-neutral-500 hover:text-rose-400 py-1 text-[11px] transition text-center underline underline-offset-2"
            >
              Reset Demo Data to Initial
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
