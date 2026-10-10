/* screen-notifications.jsx — notification bell + slide-out drawer */

/* ---- Global notification store ---- */
let _notifListeners = new Set();
let _notifications = [];
let _unreadCount = 0;

function addNotification(n) {
  _notifications = [{ id: Date.now(), ts: new Date(), read: false, ...n }, ..._notifications].slice(0, 40);
  _unreadCount = _notifications.filter(n => !n.read).length;
  _notifListeners.forEach(f => f([..._notifications], _unreadCount));
}

function markAllRead() {
  _notifications = _notifications.map(n => ({ ...n, read: true }));
  _unreadCount = 0;
  _notifListeners.forEach(f => f([..._notifications], 0));
}

function useNotifications() {
  const [notifs, setNotifs] = React.useState([..._notifications]);
  const [unread, setUnread]  = React.useState(_unreadCount);
  React.useEffect(() => {
    const fn = (ns, u) => { setNotifs(ns); setUnread(u); };
    _notifListeners.add(fn);
    return () => _notifListeners.delete(fn);
  }, []);
  return { notifs, unread };
}

/* Seed a few startup notifications */
setTimeout(() => {
  addNotification({ type: "charge",    title: "Batterij begint laden",      body: "Prijs gedaald naar 5,1 ct/kWh — goedkoopste uur van de dag." });
  addNotification({ type: "savings",   title: "Dagbesparing bijgewerkt",    body: "Vandaag al €1,82 bespaard op energiekosten." });
  addNotification({ type: "info",      title: "Dagplan gereed",             body: "BattBrain heeft het handelsplan voor vandaag berekend." });
  addNotification({ type: "discharge", title: "Terugleveren gestart",       body: "Prijs gestegen naar 30,2 ct/kWh — optimaal moment." });
}, 300);

/* Wire demo action changes into notification store */
let _lastAction = null;
Demo.subscribe(snap => {
  if (snap.action !== _lastAction) {
    _lastAction = snap.action;
    const msgs = {
      charge:    { type: "charge",    title: "Batterij begint laden",    body: snap.decisions[0]?.reason || "" },
      discharge: { type: "discharge", title: "Terugleveren aan het net", body: snap.decisions[0]?.reason || "" },
      idle:      { type: "info",      title: "Wachten op gunstig moment", body: snap.decisions[0]?.reason || "" },
    };
    if (msgs[snap.action]) addNotification(msgs[snap.action]);
  }
});

/* ---- Type metadata ---- */
const NOTIF_META = {
  charge:    { icon: "⚡", color: "var(--c-charge)" },
  discharge: { icon: "💰", color: "var(--accent)" },
  savings:   { icon: "€",  color: "var(--accent)" },
  info:      { icon: "ℹ",  color: "var(--c-pv)" },
  warning:   { icon: "⚠",  color: "var(--price-mid)" },
  success:   { icon: "✓",  color: "var(--accent)" },
};

function relTime(date) {
  const s = Math.round((Date.now() - date) / 1000);
  if (s < 60)  return "Zojuist";
  if (s < 3600) return `${Math.floor(s / 60)} min geleden`;
  return `${Math.floor(s / 3600)} uur geleden`;
}

/* ---- NotifItem ---- */
function NotifItem({ n }) {
  const meta = NOTIF_META[n.type] || NOTIF_META.info;
  return (
    <div style={{
      display: "flex", gap: 12, padding: "var(--sp-4) var(--sp-5)",
      borderBottom: "1px solid var(--border)",
      background: n.read ? "transparent" : `color-mix(in oklab, ${meta.color} 5%, transparent)`,
      transition: "background 0.3s ease",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flex: "none",
        background: `color-mix(in oklab, ${meta.color} 16%, transparent)`,
        color: meta.color, display: "grid", placeItems: "center",
        fontSize: 16,
        boxShadow: n.read ? "none" : `0 4px 12px -4px color-mix(in oklab, ${meta.color} 30%, transparent)`,
      }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="between" style={{ marginBottom: 2 }}>
          <span style={{ fontWeight: n.read ? 500 : 700, fontSize: 14.5 }}>{n.title}</span>
          {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, flex: "none" }} />}
        </div>
        {n.body && <div className="faint" style={{ fontSize: 13, lineHeight: 1.4, textWrap: "pretty" }}>{n.body}</div>}
        <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>{relTime(n.ts)}</div>
      </div>
    </div>
  );
}

/* ---- NotifDrawer ---- */
function NotifDrawer({ open, onClose }) {
  const { notifs, unread } = useNotifications();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) { requestAnimationFrame(() => setVisible(true)); }
    else { setVisible(false); }
  }, [open]);

  if (!open && !visible) return null;

  return (
    <React.Fragment>
      {/* backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />

      {/* drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(400px, 92vw)",
        zIndex: 201,
        background: "var(--surface)",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-sat))",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-sat))",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.35)",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.38s cubic-bezier(0.16, 0.84, 0.44, 1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* header */}
        <div className="between" style={{ padding: "var(--sp-5) var(--sp-5) var(--sp-4)", borderBottom: "1px solid var(--border)", flex: "none" }}>
          <div className="row" style={{ gap: "var(--sp-3)" }}>
            <h2 style={{ fontSize: 20 }}>Meldingen</h2>
            {unread > 0 && (
              <span style={{
                minWidth: 22, height: 22, borderRadius: 99,
                background: "var(--accent)", color: "#06140d",
                fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center", padding: "0 6px",
              }}>{unread}</span>
            )}
          </div>
          <div className="row" style={{ gap: "var(--sp-3)" }}>
            {unread > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 13, padding: "6px 12px" }} onClick={markAllRead}>
                Alles gelezen
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: 0, color: "var(--text-faint)", cursor: "pointer", padding: 8, display: "grid", placeItems: "center", borderRadius: 8 }}>
              {I.close({ size: 20 })}
            </button>
          </div>
        </div>

        {/* filter tabs */}
        {React.createElement(() => {
          const [activeTab, setActiveTab] = React.useState("Alles");
          const FILTER_MAP = {
            "Alles":   null,
            "Trades":  ["charge", "discharge", "savings"],
            "Systeem": ["info", "warning", "success"],
          };
          const filtered = FILTER_MAP[activeTab]
            ? notifs.filter(n => FILTER_MAP[activeTab].includes(n.type))
            : notifs;

          return (
            <React.Fragment>
              <div className="row" style={{ gap: 4, padding: "var(--sp-3) var(--sp-5)", borderBottom: "1px solid var(--border)", flex: "none" }}>
                {["Alles", "Trades", "Systeem"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    border: 0, borderRadius: 8, padding: "6px 14px", fontSize: 13.5, fontWeight: 600,
                    background: tab === activeTab ? "var(--surface-3)" : "transparent",
                    color: tab === activeTab ? "var(--text)" : "var(--text-faint)",
                    cursor: "pointer", transition: "all 0.2s ease",
                  }}>{tab}
                    {tab !== "Alles" && (
                      <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 99, background: "var(--surface-2)", color: "var(--text-faint)" }}>
                        {(FILTER_MAP[tab] ? notifs.filter(n => FILTER_MAP[tab].includes(n.type)) : notifs).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filtered.length === 0 ? (
                  <div className="center" style={{ flexDirection: "column", gap: "var(--sp-4)", padding: "var(--sp-12) 0", color: "var(--text-faint)" }}>
                    {I.bell({ size: 36 })}
                    <div style={{ fontSize: 15 }}>Geen meldingen in deze categorie</div>
                  </div>
                ) : (
                  filtered.map(n => <NotifItem key={n.id} n={n} />)
                )}
              </div>
            </React.Fragment>
          );
        })()}
      </div>
    </React.Fragment>
  );
}

/* ---- NotifBell: for sidebar ---- */
function NotifBell({ onClick }) {
  const { unread } = useNotifications();
  return (
    <button onClick={onClick} style={{
      position: "relative", background: "none", border: 0,
      color: unread > 0 ? "var(--accent)" : "var(--text-faint)",
      cursor: "pointer", padding: 9, borderRadius: 10,
      display: "grid", placeItems: "center",
      transition: "color 0.2s ease, background 0.2s ease",
    }} title="Meldingen">
      {I.bell({ size: 20 })}
      {unread > 0 && (
        <span style={{
          position: "absolute", top: 5, right: 5,
          minWidth: 16, height: 16, borderRadius: 99,
          background: "var(--accent)", color: "#06140d",
          fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center",
          padding: "0 3px",
          animation: "actionPulse 2s ease-in-out infinite",
          boxShadow: "0 0 8px var(--accent)",
        }}>{unread > 9 ? "9+" : unread}</span>
      )}
    </button>
  );
}

Object.assign(window, { NotifDrawer, NotifBell, addNotification, useNotifications, markAllRead });
