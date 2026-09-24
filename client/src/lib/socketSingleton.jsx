// /src/lib/socketSingleton.js
import SocketClient from "@/lib/socketClient";
import { getBrowserId, getTabId } from "@/lib/ids";

let socketInstance = null;
export const getSocketClient = () => {
  if (!socketInstance)
    socketInstance = createProxiedSocketClient(import.meta.env.VITE_SERVER_URL);
  return socketInstance;
};

function createProxiedSocketClient(serverUrl) {
  const bus = new BroadcastChannel("socket-bus");
  const browserId = getBrowserId();
  const tabId = getTabId();

  let isLeader = false;
  let leaderHeartbeat = Date.now();
  let heartbeatTimer = null;
  let leaderSetupDone = false;

  // keep a handle to the real client in the leader
  let leaderClient = null;

  const proxy = {
    socket: null,
    browserId,
    tabId,
    listeners: new Map(),
    joinedRooms: new Set(),
    userId: null,
    isGuest: true,
    _readyCallbacks: new Set(),
    _forceLogoutCallbacks: new Set(),
    _generic: new Map(),

    // ---- Presence mirrors for followers ----
    _presence: { page: null, title: null, meta: null },

    // presence auto/keepalive (run in proxy so followers work too)
    presenceThrottleMs: 4000,
    _presenceTimer: null,
    _presenceGetter: null,
    _lastPresenceSentAt: 0,

    // ---- Room derivation & syncing (proxy-level consistency) ----
    _desiredRooms() {
      const desired = new Set();
      if (this.isGuest) {
        desired.add("guestRoom");
      } else if (this.userId) {
        desired.add(`user:${this.userId}`);
        desired.add("realtimeDB");
      }
      return desired;
    },

    _applyRoomsToLeader(desired) {
      // Leave anything not desired
      for (const room of Array.from(this.joinedRooms)) {
        if (!desired.has(room)) {
          this.joinedRooms.delete(room);
          emitViaLeader("leaveRoom", room);
        }
      }
      // Join anything missing
      for (const room of desired) {
        if (!this.joinedRooms.has(room)) {
          this.joinedRooms.add(room);
          emitViaLeader("joinRoom", room);
        }
      }
    },

    _syncRooms() {
      const desired = this._desiredRooms();
      this._applyRoomsToLeader(desired);
    },

    on(event, cb) {
      if (!this._generic.has(event)) this._generic.set(event, new Set());
      this._generic.get(event).add(cb);
    },
    off(event, cb) {
      this._generic.get(event)?.delete(cb);
      if (this._generic.get(event)?.size === 0) this._generic.delete(event);
    },
    emit(event, payload) {
      emitViaLeader(event, payload);
    },

    onReady(cb) {
      if (typeof cb === "function") {
        setTimeout(cb, 0);
        this._readyCallbacks.add(cb);
      }
    },
    offReady(cb) {
      this._readyCallbacks.delete(cb);
    },

    onForceLogout(cb) {
      this._forceLogoutCallbacks.add(cb);
    },
    offForceLogout(cb) {
      this._forceLogoutCallbacks.delete(cb);
    },

    registerUser(userId) {
      this.userId = userId || null;
      this.isGuest = !userId;

      // Tell leader our current identity first
      if (userId) emitViaLeader("registerUser", userId);
      else emitViaLeader("registerUser", null);

      // Then atomically sync desired rooms
      this._syncRooms();
    },

joinRoom(room, payload = {}) {
  if (room === "guestRoom" && !this.isGuest) {
    if (this.joinedRooms.has("guestRoom")) {
      this.joinedRooms.delete("guestRoom");
      emitViaLeader("leaveRoom", "guestRoom");
    }
    return;
  }
  if (room.startsWith("user:")) {
    if (this.isGuest) return;
    if (!this.userId || room !== `user:${this.userId}`) return;
  }

  if (this.joinedRooms.has(room)) return;
  this.joinedRooms.add(room);

  // 👇 forward payload to leader
  emitViaLeader("joinRoom", { room, payload });
},

    leaveRoom(room) {
      if (!this.joinedRooms.has(room)) return;
      this.joinedRooms.delete(room);
      emitViaLeader("leaveRoom", room);
    },
    sendMessage(room, message) {
      emitViaLeader("message", { room, message });
    },

    onMessage(cb) {
      if (!this.listeners.has("message"))
        this.listeners.set("message", new Set());
      this.listeners.get("message").add(cb);
    },
    offMessage(cb) {
      if (!this.listeners.has("message")) return;
      this.listeners.get("message").delete(cb);
      if (this.listeners.get("message").size === 0)
        this.listeners.delete("message");
    },

    onDbChange(model, action, cb) {
      const key = getKey(model, action);
      if (!this.listeners.has(key)) this.listeners.set(key, new Set());
      this.listeners.get(key).add(cb);
    },
    offDbChange(model, action, cb) {
      const key = getKey(model, action);
      if (this.listeners.has(key)) {
        this.listeners.get(key).delete(cb);
        if (this.listeners.get(key).size === 0) this.listeners.delete(key);
      }
    },

    // expose rehandshake via leader
    rehandshake() {
      if (isLeader && leaderClient) {
        leaderClient.rehandshake();
      } else {
        bus.postMessage({ t: "reh" });
      }
    },

    // ===== Presence API passthroughs (followers call → leader emits) =====
    updatePresence({ page, title = null, meta = null } = {}) {
      if (!page) return;
      this._presence = { page, title, meta };
      emitViaLeader("presence:update", {
        page,
        title,
        meta: meta || null,
        tabId,
        at: Date.now(),
      });
    },
    clearPresence({ silent = false } = {}) {
      const last = this._presence?.page;
      this._presence = { page: null, title: null, meta: null };
      if (!silent) {
        emitViaLeader("presence:leave", { page: last || null, tabId });
      }
    },

    // NEW: auto keepalive with change detection + throttle
    startPresenceAuto(getPresence, { interval = 5000 } = {}) {
      this._presenceGetter = getPresence;
      if (this._presenceTimer) clearInterval(this._presenceTimer);

      const tick = () => {
        try {
          const p =
            typeof this._presenceGetter === "function"
              ? this._presenceGetter()
              : null;
          if (!p?.page) return;
          const changed =
            p.page !== this._presence.page ||
            JSON.stringify(p.meta || null) !==
              JSON.stringify(this._presence.meta || null) ||
            (p.title || null) !== (this._presence.title || null);
          const now = Date.now();
          if (changed) {
            this.updatePresence(p);
            this._lastPresenceSentAt = now;
          } else if (now - this._lastPresenceSentAt >= this.presenceThrottleMs) {
            // keepalive ping so server doesn’t mark us stale
            emitViaLeader("presence:update", {
              page: this._presence.page,
              title: this._presence.title,
              meta: this._presence.meta || null,
              tabId,
              at: now,
            });
            this._lastPresenceSentAt = now;
          }
        } catch (e) {
          console.warn("[Presence] auto getter error (proxy):", e);
        }
      };

      // fire immediately, then on interval
      tick();
      this._presenceTimer = setInterval(tick, interval);
    },
    stopPresenceAuto() {
      if (this._presenceTimer) clearInterval(this._presenceTimer);
      this._presenceTimer = null;
      this._presenceGetter = null;
    },

    disconnect() {
      if (isLeader && this.socket) this.socket.disconnect();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      this.socket = null;
      isLeader = false;
      leaderSetupDone = false;
      leaderClient = null;
    },

    leaveAllRooms() {
      for (const room of this.joinedRooms) this.leaveRoom(room);
      this.joinedRooms.clear();
    },
  };

  function getKey(m, a) {
    return `${m}:${a}`;
  }
  function dispatchDbChange({ model, action, data }) {
    const exact = getKey(model, action);
    const wild = getKey(model, "*");
    const send = (k) => {
      if (proxy.listeners.has(k)) {
        for (const cb of proxy.listeners.get(k)) cb(action, data);
      }
    };
    send(exact);
    send(wild);
  }
  function dispatchMessage(data) {
    if (proxy.listeners.has("message")) {
      for (const cb of proxy.listeners.get("message")) cb(data);
    }
  }
  function dispatchReady() {
    for (const cb of proxy._readyCallbacks) cb();
  }
  function dispatchForceLogout(data) {
    // Flip to guest locally and atomically sync rooms
    proxy.userId = null;
    proxy.isGuest = true;
    proxy._syncRooms();

    for (const cb of proxy._forceLogoutCallbacks) cb(data);
    dispatchMessage({ type: "forceLogout", ...data });
    dispatchGeneric("forceLogout", data);
  }
  function dispatchGeneric(ev, data) {
    if (proxy._generic.has(ev)) {
      for (const cb of proxy._generic.get(ev)) cb(data);
    }
  }
  function emitViaLeader(event, payload) {
    if (isLeader && proxy.socket?.connected) proxy.socket.emit(event, payload);
    else bus.postMessage({ t: "emit", event, payload });
  }

  function becomeLeader() {
    if (isLeader) return;
    isLeader = true;

    if (!leaderSetupDone) {
      leaderSetupDone = true;

      const real = new SocketClient(serverUrl, { auth: { browserId, tabId } });
      leaderClient = real; // keep for rehandshake()
      proxy.socket = real.socket;

      const forward = [
        "connect",
        "disconnect",
        "pongCheck",
        "dbChange",
        "message",
        "forceLogout",
        "socketStats",
        "socketCounts",
        // presence streams
        "presenceCounts",
        "presenceSnapshot",
      ];
      forward.forEach((ev) => {
        real.socket.on(ev, (data) => {
          if (ev === "connect") {
            // On leader connect, ensure identity then rooms are applied atomically
            if (proxy.userId && !proxy.isGuest) {
              real.socket.emit("registerUser", proxy.userId);
            } else {
              real.socket.emit("registerUser", null);
            }
            // Sync desired rooms to the server
            const desired = proxy._desiredRooms();
            // Leave any unknowns (defensive)
            if (!proxy.isGuest) {
              real.socket.emit("leaveRoom", "guestRoom");
            } else {
              // guest should not be in user:* or realtimeDB
              for (const r of Array.from(proxy.joinedRooms)) {
                if (r.startsWith("user:") || r === "realtimeDB")
                  real.socket.emit("leaveRoom", r);
              }
            }
            for (const room of desired) real.socket.emit("joinRoom", room);

            // replay last presence from any follower
            if (proxy._presence?.page) {
              real.socket.emit("presence:update", {
                page: proxy._presence.page,
                title: proxy._presence.title,
                meta: proxy._presence.meta || null,
                tabId,
                at: Date.now(),
              });
            }

            dispatchReady();
            dispatchGeneric("connect");
          }
          bus.postMessage({ t: "srv", ev, data });
          if (ev === "dbChange") dispatchDbChange(data);
          else if (ev === "message") dispatchMessage(data);
          else if (ev === "forceLogout") dispatchForceLogout(data);
          else dispatchGeneric(ev, data);
        });
      });
    }

    if (!heartbeatTimer) {
      heartbeatTimer = setInterval(() => {
        bus.postMessage({ t: "heartbeat", ts: Date.now() });
      }, 1000);
    }
  }

  function resignLeadership() {
    if (!isLeader) return;
    isLeader = false;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    if (proxy.socket) proxy.socket.disconnect();
    proxy.socket = null;
    leaderClient = null;
    leaderSetupDone = false;
  }

  bus.onmessage = (e) => {
    const msg = e.data;
    if (!msg || !msg.t) return;
    if (msg.t === "who-is-leader") {
      if (isLeader) bus.postMessage({ t: "i-am-leader" });
    } else if (msg.t === "i-am-leader") {
      leaderHeartbeat = Date.now();
    } else if (msg.t === "heartbeat") {
      leaderHeartbeat = msg.ts;
    } 
    
else if (msg.t === "emit") {
  if (isLeader && proxy.socket?.connected) {
    if (msg.event === "joinRoom" && msg.payload?.room) {
      proxy.socket.emit("joinRoom", msg.payload.room, msg.payload.payload);
    } else {
      proxy.socket.emit(msg.event, msg.payload);
    }
  }
}

    else if (msg.t === "srv") {
      if (msg.ev === "dbChange") dispatchDbChange(msg.data);
      else if (msg.ev === "message") dispatchMessage(msg.data);
      else if (msg.ev === "forceLogout") dispatchForceLogout(msg.data);
      else if (msg.ev === "connect") dispatchReady();
      dispatchGeneric(msg.ev, msg.data);
    } else if (msg.t === "reh") {
      // non-leader asked us to rehandshake
      if (isLeader && leaderClient) leaderClient.rehandshake();
    }
  };

  setInterval(() => {
    if (!isLeader && Date.now() - leaderHeartbeat > 2500) becomeLeader();
  }, 1000);

  bus.postMessage({ t: "who-is-leader" });
  setTimeout(() => becomeLeader(), 300);
  window.addEventListener("beforeunload", () => {
    // send presence:leave for this tab before resigning
    try {
      proxy.stopPresenceAuto?.();
      proxy.clearPresence?.({ silent: false });
    } catch {}
    resignLeadership();
  });

  return proxy;
}
