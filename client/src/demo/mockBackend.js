// client/src/demo/mockBackend.js
// Standalone Live Demo Mock Engine for Museo Bulawan MIS
import axios from "axios";
import axiosClient from "../lib/axiosClient";
import {
  demoUser,
  demoUsersList,
  demoInvitations,
  demoRouterFlags,
  demoArtifacts,
  demoArticles,
  demoAppointments,
  demoVisitorRecords,
  demoSchedules,
  demoContributions,
  demoLogs,
  demoWebsiteTraffic,
} from "./mockData";

const STORAGE_KEYS = {
  USER: "mb_mis_demo_user",
  FLAGS: "mb_mis_demo_flags",
  ARTIFACTS: "mb_mis_demo_artifacts",
  ARTICLES: "mb_mis_demo_articles",
  APPOINTMENTS: "mb_mis_demo_appointments",
  CONTRIBUTIONS: "mb_mis_demo_contributions",
  SCHEDULES: "mb_mis_demo_schedules",
  USERS: "mb_mis_demo_users",
  INVITATIONS: "mb_mis_demo_invitations",
  LOGS: "mb_mis_demo_logs",
};

// Helper: safe JSON localStorage getter/setter
function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn("[DemoBackend] localStorage write failed", err);
  }
}

// Reset all demo data to initial state
export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.FLAGS);
  localStorage.removeItem(STORAGE_KEYS.ARTIFACTS);
  localStorage.removeItem(STORAGE_KEYS.ARTICLES);
  localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
  localStorage.removeItem(STORAGE_KEYS.CONTRIBUTIONS);
  localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.INVITATIONS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  window.location.reload();
}

// Quick 1-click admin login
export function setDemoUserAdmin() {
  setStored(STORAGE_KEYS.USER, demoUser);
  return demoUser;
}

// Obfuscate flags for /auth/router-flags
function xorEncode(obj, key = "museo") {
  const jsonStr = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(jsonStr);
  const xored = Array.from(bytes, (b, i) => b ^ key.charCodeAt(i % key.length));
  const binary = String.fromCharCode(...xored);
  return btoa(binary);
}

function getObfuscatedFlags() {
  const currentFlags = getStored(STORAGE_KEYS.FLAGS, demoRouterFlags);
  const flagMap = {};
  const routeKeyMap = {};
  let count = 0;
  for (const [k, v] of Object.entries(currentFlags)) {
    count++;
    const alias = `a${count}`;
    routeKeyMap[k] = alias;
    flagMap[alias] = v;
  }
  return {
    encoded: xorEncode(flagMap, "museo"),
    keys: xorEncode(routeKeyMap, "museo"),
  };
}

// Main mock request resolver
export function resolveMockRequest(url, method = "GET", data = null, params = {}) {
  const cleanUrl = url
    .replace(/^https?:\/\/[^/]+/i, "") // strip origin
    .replace(/^\/api/, "")             // normalize /api prefix
    .split("?")[0];                    // strip query string

  const m = (method || "GET").toUpperCase();

  // 1. ROUTER FLAGS
  if (cleanUrl === "/auth/router-flags") {
    if (m === "GET") {
      return { status: 200, data: getObfuscatedFlags() };
    }
    if (m === "POST") {
      const { route_key, is_enabled } = data || {};
      const flags = getStored(STORAGE_KEYS.FLAGS, { ...demoRouterFlags });
      const oldState = { route_key, is_enabled: flags[route_key] ?? false };
      if (route_key) {
        flags[route_key] = is_enabled;
        setStored(STORAGE_KEYS.FLAGS, flags);

        // Append to logs
        const logs = getStored(STORAGE_KEYS.LOGS, demoLogs);
        const currentUser = getStored(STORAGE_KEYS.USER, demoUser);
        logs.unshift({
          id: Date.now(),
          user_name: currentUser.full_name || "Louis Ricafrente",
          role: currentUser.role || "Admin",
          user: {
            id: currentUser.id || 1,
            fname: currentUser.fname || "Louis",
            lname: currentUser.lname || "Ricafrente",
            first_name: currentUser.fname || "Louis",
            last_name: currentUser.lname || "Ricafrente",
            role: currentUser.role || "Admin",
            roleId: currentUser.roleId || 1,
            username: currentUser.username || "admin",
          },
          action: "update",
          model: "RouterFlag",
          description: `Toggled router flag '${route_key}' to ${is_enabled ? "enabled" : "disabled"}`,
          details: `Toggled router flag '${route_key}' to ${is_enabled ? "enabled" : "disabled"}`,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          beforeState: JSON.stringify(oldState),
          afterState: JSON.stringify({ route_key, is_enabled }),
        });
        setStored(STORAGE_KEYS.LOGS, logs);
      }
      return {
        status: 200,
        data: {
          message: `Flag '${route_key}' updated`,
          flag: { route_key, is_enabled },
          flags,
        },
      };
    }
  }

  if (cleanUrl === "/auth/router-flags/maintenance") {
    const { enable } = data || {};
    const flags = getStored(STORAGE_KEYS.FLAGS, { ...demoRouterFlags });
    const oldMaintenance = flags.maintenance ?? false;
    flags.maintenance = !!enable;
    setStored(STORAGE_KEYS.FLAGS, flags);

    // Append to logs
    const logs = getStored(STORAGE_KEYS.LOGS, demoLogs);
    const currentUser = getStored(STORAGE_KEYS.USER, demoUser);
    logs.unshift({
      id: Date.now(),
      user_name: currentUser.full_name || "Louis Ricafrente",
      role: currentUser.role || "Admin",
      user: {
        id: currentUser.id || 1,
        fname: currentUser.fname || "Louis",
        lname: currentUser.lname || "Ricafrente",
        first_name: currentUser.fname || "Louis",
        last_name: currentUser.lname || "Ricafrente",
        role: currentUser.role || "Admin",
        roleId: currentUser.roleId || 1,
        username: currentUser.username || "admin",
      },
      action: "update",
      model: "RouterFlag",
      description: `Maintenance mode ${enable ? "enabled" : "disabled"}`,
      details: `Maintenance mode ${enable ? "enabled" : "disabled"}`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      beforeState: JSON.stringify({ maintenance: oldMaintenance }),
      afterState: JSON.stringify({ maintenance: !!enable }),
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return {
      status: 200,
      data: {
        message: `Maintenance mode ${enable ? "enabled" : "disabled"} successfully.`,
      },
    };
  }

  // 2. ADMIN FLAGS
  if (cleanUrl === "/auth/admin-flags") {
    const flags = getStored(STORAGE_KEYS.FLAGS, { ...demoRouterFlags });
    const adminFlags = Object.entries(flags).map(([route_key, is_enabled]) => ({
      route_key,
      is_enabled,
      is_public: ["login", "catalogs_public", "home", "appointment_public", "articles_public", "about", "acquisition_public"].includes(route_key),
    }));
    return { status: 200, data: { flags: adminFlags } };
  }

  // 3. AUTH: /auth/me
  if (cleanUrl === "/auth/me") {
    const user = getStored(STORAGE_KEYS.USER, null);
    if (!user) {
      return { status: 401, data: { message: "Unauthenticated" } };
    }
    return { status: 200, data: { user } };
  }

  // 4. AUTH: /auth/login
  if (cleanUrl === "/auth/login") {
    const loggedIn = { ...demoUser };
    setStored(STORAGE_KEYS.USER, loggedIn);
    // Record login in demo logs
    const logs = getStored(STORAGE_KEYS.LOGS, [...demoLogs]);
    logs.unshift({
      id: Date.now(),
      user_name: loggedIn.full_name,
      role: loggedIn.role,
      action: "LOGIN_SUCCESS",
      model: "Auth",
      details: "User logged into Live Demo Admin Session",
      created_at: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.LOGS, logs);
    return { status: 200, data: { message: "Login successful", user: loggedIn } };
  }

  // 5. AUTH: /auth/logout
  if (cleanUrl === "/auth/logout") {
    localStorage.removeItem(STORAGE_KEYS.USER);
    return { status: 200, data: { message: "Logged out" } };
  }

  // 6. INVENTORY
  if (cleanUrl === "/auth/inventory" || cleanUrl === "/inventory") {
    const items = getStored(STORAGE_KEYS.ARTIFACTS, demoArtifacts);
    return { status: 200, data: items };
  }

  if (cleanUrl === "/auth/inventory/export") {
    return {
      status: 200,
      data: new Blob(["PK\x03\x04...mock_excel_export..."], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    };
  }

  // Single artifact detail: /auth/catalog/preview/:id or /auth/inventory/:id
  if (cleanUrl.startsWith("/auth/catalog/preview/") || cleanUrl.startsWith("/auth/inventory/")) {
    const segments = cleanUrl.split("/");
    const id = segments[segments.length - 1];
    const items = getStored(STORAGE_KEYS.ARTIFACTS, demoArtifacts);
    const found = items.find((i) => String(i.contribution_id) === String(id) || String(i.artifact_id) === String(id)) || items[0];
    return { status: 200, data: found };
  }

  // 7. PUBLIC CATALOGUE ARTIFACTS
  if (cleanUrl === "/auth/public-artifacts") {
    const items = getStored(STORAGE_KEYS.ARTIFACTS, demoArtifacts);
    return { status: 200, data: items };
  }

  // 8. APPOINTMENTS
  if (cleanUrl === "/auth/appointment") {
    if (m === "GET") {
      const appointments = getStored(STORAGE_KEYS.APPOINTMENTS, demoAppointments);
      return { status: 200, data: appointments };
    }
    if (m === "POST") {
      const appointments = getStored(STORAGE_KEYS.APPOINTMENTS, demoAppointments);
      const newAppt = {
        appointment_id: Date.now(),
        ...(data || {}),
        creation_date: new Date().toISOString(),
        AppointmentStatus: { status: "PENDING" },
        status: "PENDING",
      };
      appointments.unshift(newAppt);
      setStored(STORAGE_KEYS.APPOINTMENTS, appointments);
      return { status: 201, data: newAppt };
    }
  }

  if (cleanUrl === "/auth/appointment/stats") {
    const appointments = getStored(STORAGE_KEYS.APPOINTMENTS, demoAppointments);
    const approved = appointments.filter((a) => (a.status || a.AppointmentStatus?.status) === "APPROVED").length;
    const pending = appointments.filter((a) => (a.status || a.AppointmentStatus?.status) === "PENDING").length;
    const completed = appointments.filter((a) => (a.status || a.AppointmentStatus?.status) === "COMPLETED").length;
    return {
      status: 200,
      data: {
        approved,
        pending,
        completed,
        rejected: 1,
        failed: 0,
        expectedVisitors: 120,
        present: 78,
      },
    };
  }

  if (cleanUrl === "/auth/visitor-records") {
    return { status: 200, data: demoVisitorRecords };
  }

  // 9. SCHEDULES
  if (cleanUrl === "/auth/schedules" || cleanUrl === "/auth/schedules/public/availability") {
    const schedules = getStored(STORAGE_KEYS.SCHEDULES, demoSchedules);
    return { status: 200, data: schedules };
  }

  // 10. ACQUISITIONS & CONTRIBUTIONS
  if (cleanUrl === "/auth/contributions" || cleanUrl === "/auth/contributions/") {
    if (m === "GET") {
      const list = getStored(STORAGE_KEYS.CONTRIBUTIONS, demoContributions);
      return { status: 200, data: list };
    }
    if (m === "POST") {
      const list = getStored(STORAGE_KEYS.CONTRIBUTIONS, demoContributions);
      const newContrib = {
        contribution_id: Date.now(),
        ...(data || {}),
        status: "pending",
        transfer_status: "pending",
        submission_date: new Date().toISOString().split("T")[0],
      };
      list.unshift(newContrib);
      setStored(STORAGE_KEYS.CONTRIBUTIONS, list);
      return { status: 201, data: newContrib };
    }
  }

  if (cleanUrl === "/auth/contributions/summary") {
    const list = getStored(STORAGE_KEYS.CONTRIBUTIONS, demoContributions);
    return {
      status: 200,
      data: {
        totalCount: list.length,
        approvedCount: list.filter((c) => c.status === "approved").length,
        pendingCount: list.filter((c) => c.status === "pending").length,
        completedCount: list.filter((c) => c.status === "completed").length,
        rejectedCount: 0,
        donationCount: list.filter((c) => c.type === "donation").length,
        lendingCount: list.filter((c) => c.type === "lending").length,
      },
    };
  }

  if (cleanUrl === "/auth/contributions/donors" || cleanUrl === "/auth/contributions/donors/") {
    const list = getStored(STORAGE_KEYS.CONTRIBUTIONS, demoContributions);
    return { status: 200, data: list };
  }

  // 11. ARTICLES
  if (cleanUrl === "/auth/articles" || cleanUrl === "/auth/public-articles") {
    const articles = getStored(STORAGE_KEYS.ARTICLES, demoArticles);
    return { status: 200, data: articles };
  }

  if (cleanUrl.startsWith("/auth/public-article/") || cleanUrl.startsWith("/auth/article/")) {
    const id = cleanUrl.split("/").pop();
    const articles = getStored(STORAGE_KEYS.ARTICLES, demoArticles);
    const found = articles.find((a) => String(a.article_id) === String(id)) || articles[0];
    return { status: 200, data: found };
  }

  // 12. USERS & INVITATIONS
  if (cleanUrl === "/auth/users") {
    const users = getStored(STORAGE_KEYS.USERS, demoUsersList);
    return { status: 200, data: users };
  }

  // Single user by ID or fullName: /auth/user/:fullName
  if (cleanUrl.startsWith("/auth/user/")) {
    const rawTarget = cleanUrl.replace("/auth/user/", "");
    const decodedTarget = decodeURIComponent(rawTarget).trim().toLowerCase();
    const users = getStored(STORAGE_KEYS.USERS, demoUsersList);
    const found = users.filter((u) => {
      const uFullName = `${u.fname || ""} ${u.lname || ""}`.trim().toLowerCase();
      const uId = String(u.id);
      const uUsername = (u.username || "").toLowerCase();
      return (
        uFullName === decodedTarget ||
        uId === decodedTarget ||
        uUsername === decodedTarget ||
        uFullName.includes(decodedTarget)
      );
    });

    if (found.length > 0) {
      return { status: 200, data: found };
    }
    // Fallback: return default user in array
    return { status: 200, data: [users[0] || demoUser] };
  }

  if (cleanUrl === "/auth/invitations") {
    const invitations = getStored(STORAGE_KEYS.INVITATIONS, demoInvitations);
    return { status: 200, data: invitations };
  }

  // Create/Send Invitation: POST /auth/send-invitation
  if (cleanUrl === "/auth/send-invitation" && m === "POST") {
    const { first_name, last_name, email, contact_number, role } = data || {};
    const roleIdMap = {
      Admin: 1,
      "Content Manager": 2,
      Viewer: 3,
      Reviewer: 4,
    };
    const roleId = roleIdMap[role] || 3;
    const invitations = getStored(STORAGE_KEYS.INVITATIONS, demoInvitations);
    const newInvite = {
      id: Date.now(),
      first_name: first_name || "New",
      last_name: last_name || "User",
      email: email || "user@museobulawan.ph",
      contact_number: contact_number || "0917-000-0000",
      role: role || "Viewer",
      roleId,
      status: "Pending",
      isUsed: false,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };
    invitations.unshift(newInvite);
    setStored(STORAGE_KEYS.INVITATIONS, invitations);

    // Also add to users list
    const users = getStored(STORAGE_KEYS.USERS, demoUsersList);
    const newUser = {
      id: Date.now(),
      fname: first_name || "New",
      lname: last_name || "User",
      first_name: first_name || "New",
      last_name: last_name || "User",
      full_name: `${first_name || "New"} ${last_name || "User"}`.trim(),
      username: (first_name || "user").toLowerCase() + "_" + Date.now().toString().slice(-4),
      email: email || "user@museobulawan.ph",
      role: role || "Viewer",
      roleId,
      position: `${role || "Staff"} Member`,
      phone: contact_number || "0917-000-0000",
      contact: contact_number || "0917-000-0000",
      contact_number: contact_number || "0917-000-0000",
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      sessions: [
        {
          id: Date.now() + 1,
          loginAt: new Date().toISOString(),
          logoutAt: null,
          isOnline: true,
          ipAddress: "192.168.1.150",
          browser: "Chrome on Windows",
        },
      ],
    };
    users.unshift(newUser);
    setStored(STORAGE_KEYS.USERS, users);

    // Add activity log
    const logs = getStored(STORAGE_KEYS.LOGS, demoLogs);
    const currentUser = getStored(STORAGE_KEYS.USER, demoUser);
    logs.unshift({
      id: Date.now(),
      user_name: currentUser.full_name || "Louis Ricafrente",
      role: currentUser.role || "Admin",
      user: {
        id: currentUser.id || 1,
        fname: currentUser.fname || "Louis",
        lname: currentUser.lname || "Ricafrente",
        first_name: currentUser.fname || "Louis",
        last_name: currentUser.lname || "Ricafrente",
        role: currentUser.role || "Admin",
        roleId: currentUser.roleId || 1,
        username: currentUser.username || "admin",
      },
      action: "create",
      model: "UserInvitation",
      description: `Invited new user: ${first_name} ${last_name} (${email}) as ${role}`,
      details: `Invited new user: ${first_name} ${last_name} (${email}) as ${role}`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      beforeState: JSON.stringify({}),
      afterState: JSON.stringify(newInvite),
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return {
      status: 201,
      data: {
        message: "Invitation sent successfully.",
        invite: newInvite,
      },
    };
  }

  // Resend invitation: POST /auth/invitation/:id/resend
  if (cleanUrl.startsWith("/auth/invitation/") && cleanUrl.endsWith("/resend")) {
    const segments = cleanUrl.split("/");
    const id = segments[segments.length - 2];
    const invitations = getStored(STORAGE_KEYS.INVITATIONS, demoInvitations);
    const invite = invitations.find((i) => String(i.id) === String(id));
    if (invite) {
      invite.expires_at = new Date(Date.now() + 86400000 * 7).toISOString();
      invite.expiresAt = invite.expires_at;
      setStored(STORAGE_KEYS.INVITATIONS, invitations);
    }
    return {
      status: 200,
      data: {
        message: "Invitation resent successfully!",
      },
    };
  }

  // Revoke invitation: DELETE /auth/invitation/:id/revoke
  if (cleanUrl.startsWith("/auth/invitation/") && cleanUrl.endsWith("/revoke")) {
    const segments = cleanUrl.split("/");
    const id = segments[segments.length - 2];
    let invitations = getStored(STORAGE_KEYS.INVITATIONS, demoInvitations);
    invitations = invitations.filter((i) => String(i.id) !== String(id));
    setStored(STORAGE_KEYS.INVITATIONS, invitations);

    return {
      status: 200,
      data: {
        message: "Invitation revoked successfully!",
      },
    };
  }

  // 13. LOGS
  // Supports single log detail: /auth/logs/:id
  if (cleanUrl.startsWith("/auth/logs/") && cleanUrl !== "/auth/logs") {
    const logId = cleanUrl.replace("/auth/logs/", "");
    const logs = getStored(STORAGE_KEYS.LOGS, demoLogs);
    const found = logs.find((l) => String(l.id) === String(logId)) || logs[0];
    return { status: 200, data: found };
  }

  // List of logs: /auth/logs with optional filter ?model= or query params
  if (cleanUrl === "/auth/logs" || cleanUrl.startsWith("/auth/logs")) {
    let logs = getStored(STORAGE_KEYS.LOGS, demoLogs);
    const queryModel = params?.model || (url.includes("model=") ? url.split("model=")[1].split("&")[0] : null);
    const queryAction = params?.action;
    const queryRole = params?.role;

    if (queryModel && queryModel !== "*") {
      logs = logs.filter((l) => (l.model || "").toLowerCase() === queryModel.toLowerCase());
    }
    if (queryAction && queryAction !== "*") {
      logs = logs.filter((l) => (l.action || "").toLowerCase() === queryAction.toLowerCase());
    }
    if (queryRole && queryRole !== "*") {
      logs = logs.filter((l) => String(l.user?.roleId || l.roleId) === String(queryRole));
    }

    return { status: 200, data: logs };
  }

  // 14. ANALYTICS & WEBSITE TRAFFIC
  if (cleanUrl.startsWith("/auth/analytics/website-traffic")) {
    return { status: 200, data: demoWebsiteTraffic };
  }

  if (cleanUrl.startsWith("/auth/analytics")) {
    return {
      status: 200,
      data: {
        totalVisitors: 14850,
        todayVisitors: 210,
        pageViews: 48920,
        traffic: demoWebsiteTraffic,
      },
    };
  }

  // Generic fallback
  return { status: 200, data: [] };
}

// Initialize Demo Backend without recursive adapters
export function initDemoBackend() {
  if (typeof window === "undefined" || window.__demoBackendInitialized) return;
  window.__demoBackendInitialized = true;

  console.log("⚡ [DemoBackend] Initializing Museo Bulawan Portfolio Demo Mode...");

  const mockAdapter = async (config) => {
    try {
      const url = config.url || "";
      const fullUrl = (config.baseURL || "") + url;
      const targetUrl = url.startsWith("http") || url.startsWith("/api") || url.startsWith("/auth") ? url : fullUrl;

      const mockRes = resolveMockRequest(targetUrl, config.method, config.data, config.params);
      if (mockRes.status >= 200 && mockRes.status < 300) {
        return {
          data: mockRes.data,
          status: mockRes.status,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          config,
          request: {},
        };
      } else {
        const err = new Error(`Request failed with status code ${mockRes.status}`);
        err.response = {
          data: mockRes.data,
          status: mockRes.status,
          statusText: "Mock Error",
          headers: { "content-type": "application/json" },
          config,
        };
        return Promise.reject(err);
      }
    } catch (err) {
      console.error("[DemoBackend] Adapter error:", err);
      return { data: {}, status: 200, statusText: "OK", config };
    }
  };

  // Directly assign non-recursive adapter to both instances
  if (axiosClient && axiosClient.defaults) {
    axiosClient.defaults.adapter = mockAdapter;
  }
  if (axios && axios.defaults) {
    axios.defaults.adapter = mockAdapter;
  }

  // Monkey-patch window.fetch
  const originalFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = init?.method || "GET";

      if (
        url.includes("/api/") ||
        url.includes("/auth/") ||
        url.startsWith("/auth") ||
        url.startsWith("/api")
      ) {
        let bodyData = null;
        if (init?.body) {
          try {
            bodyData = JSON.parse(init.body);
          } catch {}
        }
        const mockRes = resolveMockRequest(url, method, bodyData);
        return new Response(JSON.stringify(mockRes.data), {
          status: mockRes.status,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (err) {
      console.error("[DemoBackend] fetch interceptor error:", err);
    }
    return originalFetch(input, init);
  };

  console.log("✅ [DemoBackend] Ready! All API requests now route to interactive demo engine.");
}
