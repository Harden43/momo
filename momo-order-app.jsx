import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./src/supabaseClient";

// ============================================================
// MOMO ORDER - Home Kitchen Ordering Platform
// ============================================================

const COLORS = {
  bg: "#0A0A0A",
  surface: "#141414",
  surfaceHover: "#1C1C1C",
  card: "#1A1A1A",
  cardHover: "#222222",
  border: "#2A2A2A",
  borderLight: "#333333",
  accent: "#FF6B35",
  accentHover: "#FF8555",
  accentDim: "rgba(255,107,53,0.12)",
  accentGlow: "rgba(255,107,53,0.25)",
  success: "#22C55E",
  successDim: "rgba(34,197,94,0.12)",
  warning: "#FBBF24",
  warningDim: "rgba(251,191,36,0.12)",
  danger: "#EF4444",
  dangerDim: "rgba(239,68,68,0.12)",
  text: "#F5F5F5",
  textSecondary: "#999999",
  textMuted: "#666666",
  white: "#FFFFFF",
};

// ============================================================
// DATA
// ============================================================
const CATEGORIES = [
  { id: "all", label: "All", icon: "🍽️" },
  { id: "steamed", label: "Steamed", icon: "♨️" },
  { id: "fried", label: "Fried", icon: "🍳" },
  { id: "jhol", label: "Jhol", icon: "🍜" },
  { id: "c_momo", label: "C-Momo", icon: "🌶️" },
];

const ORDER_STATUSES = ["pending", "accepted", "cooking", "ready", "delivering", "delivered"];

const STATUS_CONFIG = {
  pending: { label: "Pending", color: COLORS.warning, bg: COLORS.warningDim, icon: "⏳" },
  accepted: { label: "Accepted", color: COLORS.accent, bg: COLORS.accentDim, icon: "✅" },
  cooking: { label: "Cooking", color: COLORS.accent, bg: COLORS.accentDim, icon: "🔥" },
  ready: { label: "Ready", color: COLORS.success, bg: COLORS.successDim, icon: "📦" },
  delivering: { label: "Out for Delivery", color: COLORS.success, bg: COLORS.successDim, icon: "🛵" },
  delivered: { label: "Delivered", color: COLORS.success, bg: COLORS.successDim, icon: "🎉" },
  cancelled: { label: "Cancelled", color: COLORS.danger, bg: COLORS.dangerDim, icon: "❌" },
};

const generateOrderNumber = () => `MOMO-${String(Math.floor(1000 + Math.random() * 9000))}`;

// ============================================================
// COMPONENTS: Shared
// ============================================================

function Badge({ children, color, bg, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: color || COLORS.accent, background: bg || COLORS.accentDim, letterSpacing: 0.3, ...style }}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", disabled, style, fullWidth }) {
  const base = { border: "none", borderRadius: 10, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.5 : 1, width: fullWidth ? "100%" : "auto" };
  const sizes = { sm: { padding: "8px 14px", fontSize: 13 }, md: { padding: "12px 20px", fontSize: 14 }, lg: { padding: "14px 28px", fontSize: 15 } };
  const variants = {
    primary: { background: COLORS.accent, color: COLORS.white },
    secondary: { background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` },
    ghost: { background: "transparent", color: COLORS.textSecondary },
    danger: { background: COLORS.dangerDim, color: COLORS.danger },
    success: { background: COLORS.successDim, color: COLORS.success },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = "text", style, icon }) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {icon && <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>{icon}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: icon ? "12px 16px 12px 42px" : "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", ...style }}
      />
    </div>
  );
}

// ============================================================
// APP VIEWS
// ============================================================

// --- AUTH VIEW ---
function AuthView({ onLogin }) {
  const [phone, setPhone] = useState("");
  const OTP_LENGTH = 6;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [step, setStep] = useState("phone"); // phone | otp | name
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = Array.from({ length: OTP_LENGTH }, () => useRef(null));

  const handleSendOTP = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError("");
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setOtp(Array(OTP_LENGTH).fill(""));
      setStep("otp");
    }
  };

  const handleVerify = async () => {
    const token = otp.join("");
    if (token.length < OTP_LENGTH) return;
    setLoading(true);
    setError("");
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs[0].current?.focus();
    } else {
      // Check if profile already exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", data.user.id)
        .single();
      if (profile?.name) {
        onLogin();
      } else {
        setStep("name");
      }
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      const newOtp = Array(OTP_LENGTH).fill("");
      digits.forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      setError("");
      const focusIdx = Math.min(digits.length, OTP_LENGTH - 1);
      inputRefs[focusIdx].current?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < OTP_LENGTH - 1) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleComplete = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles").upsert({
      id: user.id,
      name: name.trim(),
      phone,
      points: 0,
    });
    setLoading(false);
    onLogin();
  };

  useEffect(() => {
    if (step === "otp") inputRefs[0].current?.focus();
  }, [step]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 16, filter: "drop-shadow(0 0 30px rgba(255,107,53,0.3))" }}>🥟</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: COLORS.text, margin: 0, fontFamily: "'Playfair Display', serif", letterSpacing: -1 }}>MomoGhar</h1>
        <p style={{ color: COLORS.textSecondary, margin: "8px 0 40px", fontSize: 15, letterSpacing: 0.5 }}>Homemade Nepali Momos • Fresh to Your Door</p>

        <div style={{ background: COLORS.card, borderRadius: 20, padding: 32, border: `1px solid ${COLORS.border}` }}>
          {step === "phone" && (
            <>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 20px" }}>Enter your phone number to get started</p>
              <Input value={phone} onChange={setPhone} placeholder="+16470000000" icon="📱" type="tel" />
              <Button onClick={handleSendOTP} fullWidth style={{ marginTop: 16 }} disabled={phone.length < 10 || loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </>
          )}
          {step === "otp" && (
            <>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 12px" }}>Enter the 6-digit code sent to {phone}</p>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    maxLength={1}
                    inputMode="numeric"
                    style={{ width: 44, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700, background: COLORS.surface, border: `2px solid ${otp[i] ? COLORS.accent : error ? COLORS.danger : COLORS.border}`, borderRadius: 10, color: COLORS.text, outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }}
                    value={otp[i]}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={e => { e.preventDefault(); handleOtpChange(i, e.clipboardData.getData("text")); }}
                  />
                ))}
              </div>

              {error && <p style={{ color: COLORS.danger, fontSize: 13, margin: "0 0 12px", fontWeight: 600 }}>{error}</p>}

              <Button onClick={handleVerify} fullWidth disabled={otp.join("").length < OTP_LENGTH || loading} style={{ marginTop: 8 }}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              <button onClick={handleSendOTP} disabled={loading} style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 13, cursor: "pointer", marginTop: 12, fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>Resend Code</button>
            </>
          )}
          {step === "name" && (
            <>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 20px" }}>What should we call you?</p>
              <Input value={name} onChange={setName} placeholder="Your name" icon="👤" />
              <Button onClick={handleComplete} fullWidth style={{ marginTop: 16 }} disabled={!name.trim() || loading}>
                {loading ? "Saving..." : "Start Ordering"}
              </Button>
            </>
          )}
        </div>

        {error && step === "phone" && <p style={{ color: COLORS.danger, fontSize: 12, marginTop: 16 }}>{error}</p>}
      </div>
    </div>
  );
}

// --- CUSTOMER APP ---
function CustomerApp({ user, orders, setOrders, menu, onSwitchView }) {
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [screen, setScreen] = useState("menu"); // menu | cart | tracking | profile
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("123 Main Street, Toronto, ON");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const filteredItems = menu.filter(i => activeCategory === "all" || i.category === activeCategory);
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const deliveryFee = cartTotal >= 25 ? 0 : 3.99;
  const activeOrders = orders.filter(o => o.userId === user.id && !["delivered", "cancelled"].includes(o.status));

  const addToCart = (item) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const placeOrder = async () => {
    const orderNumber = generateOrderNumber();
    const { data: order, error } = await supabase.from("orders").insert({
      order_number: orderNumber,
      user_id: user.id,
      user_name: user.name,
      total: cartTotal + deliveryFee,
      status: "pending",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "stripe" ? "paid" : "pending",
      special_instructions: specialInstructions,
      delivery_address: deliveryAddress,
      lat: 43.6532 + (Math.random() - 0.5) * 0.05,
      lng: -79.3832 + (Math.random() - 0.5) * 0.05,
    }).select().single();

    if (error) { console.error("Order insert error:", error); return; }

    await supabase.from("order_items").insert(
      cart.map(c => ({ order_id: order.id, menu_item_id: c.id, name: c.name, qty: c.qty, price: c.price }))
    );

    // Fetch with items for local state
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order.id)
      .single();

    if (fullOrder) {
      setOrders(prev => [normalizeOrder(fullOrder), ...prev]);
    }

    setCart([]);
    setSpecialInstructions("");
    setScreen("tracking");
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  // --- MENU SCREEN ---
  if (screen === "menu") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>🥟 MomoGhar</h1>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Open • Delivery in ~30 min</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge color={COLORS.accent} bg={COLORS.accentDim}>⭐ {user.points} pts</Badge>
          <button onClick={() => setScreen("profile")} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>👤</button>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ margin: "16px 20px", padding: 24, borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent}08)`, border: `1px solid ${COLORS.accent}33` }}>
        <p style={{ margin: 0, fontSize: 13, color: COLORS.accent, fontWeight: 600 }}>🔥 FREE DELIVERY</p>
        <p style={{ margin: "4px 0 0", fontSize: 15, color: COLORS.text }}>On orders over $25 • Use code <strong>MOMO25</strong></p>
      </div>

      {/* Categories */}
      <div style={{ padding: "8px 20px", display: "flex", gap: 8, overflowX: "auto" }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{ padding: "8px 16px", borderRadius: 20, border: activeCategory === cat.id ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: activeCategory === cat.id ? COLORS.accentDim : "transparent", color: activeCategory === cat.id ? COLORS.accent : COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, paddingBottom: cartCount > 0 ? 100 : 20 }}>
        {filteredItems.map(item => {
          const inCart = cart.find(c => c.id === item.id);
          return (
            <div key={item.id} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden", opacity: item.isAvailable ? 1 : 0.5, transition: "all 0.2s" }}>
              <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ fontSize: 40, lineHeight: 1 }}>{item.image}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{item.name}</h3>
                    <span style={{ fontWeight: 800, color: COLORS.accent, fontSize: 16 }}>${item.price}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4 }}>{item.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>⏱ {item.prepTime} min</span>
                    {!item.isAvailable ? (
                      <Badge color={COLORS.danger} bg={COLORS.dangerDim}>Sold Out</Badge>
                    ) : inCart ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center" }}>{inCart.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.white, cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(item)}>+ Add</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div onClick={() => setScreen("cart")} style={{ position: "fixed", bottom: 16, left: 16, right: 16, maxWidth: 600, margin: "0 auto", padding: "14px 20px", background: COLORS.accent, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", boxShadow: `0 8px 32px ${COLORS.accentGlow}`, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 10px", fontWeight: 800, fontSize: 14 }}>{cartCount}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>View Cart</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>${(cartTotal + deliveryFee).toFixed(2)}</span>
        </div>
      )}

      {/* Active Orders Banner */}
      {activeOrders.length > 0 && (
        <div onClick={() => setScreen("tracking")} style={{ position: "fixed", bottom: cartCount > 0 ? 80 : 16, left: 16, right: 16, maxWidth: 600, margin: "0 auto", padding: "12px 20px", background: COLORS.successDim, border: `1px solid ${COLORS.success}44`, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", zIndex: 19 }}>
          <span style={{ fontSize: 14, color: COLORS.success, fontWeight: 600 }}>📍 {activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</span>
          <span style={{ fontSize: 12, color: COLORS.success }}>Track →</span>
        </div>
      )}

      {/* Dashboard Switch */}
      <button onClick={onSwitchView} style={{ position: "fixed", top: 70, right: 16, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: COLORS.textSecondary, fontSize: 11, fontFamily: "inherit", zIndex: 20 }}>⚙️ Dashboard</button>
    </div>
  );

  // --- CART SCREEN ---
  if (screen === "cart") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
        <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Your Cart</h2>
        <Badge>{cart.length} items</Badge>
      </div>

      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        {/* Cart Items */}
        {cart.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 28 }}>{item.image}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                <p style={{ margin: "2px 0 0", color: COLORS.textMuted, fontSize: 13 }}>${item.price} each</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => updateQty(item.id, -1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => updateQty(item.id, 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.white, cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        ))}

        {/* Special Instructions */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 8 }}>Special Instructions</label>
          <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Extra spicy chutney, no onions, etc." rows={2}
            style={{ width: "100%", padding: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, fontSize: 14, fontFamily: "inherit", resize: "none", boxSizing: "border-box", outline: "none" }} />
        </div>

        {/* Delivery Address */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 8 }}>📍 Delivery Address</label>
          <Input value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Enter your address" icon="🏠" />
          <div style={{ marginTop: 8, height: 120, background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted, fontSize: 13 }}>
            🗺️ Google Maps pin drop would appear here
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 8 }}>Payment Method</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ id: "cash", label: "💵 Cash", desc: "Pay on delivery" }, { id: "stripe", label: "💳 Card", desc: "Pay now via Stripe" }].map(pm => (
              <div key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `2px solid ${paymentMethod === pm.id ? COLORS.accent : COLORS.border}`, background: paymentMethod === pm.id ? COLORS.accentDim : COLORS.surface, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{pm.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>{pm.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ marginTop: 24, padding: 20, background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: COLORS.textSecondary, fontSize: 14 }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>${cartTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: COLORS.textSecondary, fontSize: 14 }}>Delivery {cartTotal >= 25 && <Badge color={COLORS.success} bg={COLORS.successDim} style={{ fontSize: 10 }}>FREE</Badge>}</span>
            <span style={{ fontWeight: 600, color: deliveryFee === 0 ? COLORS.success : COLORS.text }}>{deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}</span>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: COLORS.accent }}>${(cartTotal + deliveryFee).toFixed(2)}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.success }}>🎁 You'll earn {Math.floor((cartTotal + deliveryFee) * 10)} points with this order!</p>
        </div>

        <Button onClick={placeOrder} fullWidth size="lg" style={{ marginTop: 16 }}>Place Order 🥟</Button>
      </div>
    </div>
  );

  // --- ORDER TRACKING ---
  if (screen === "tracking") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
        <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>My Orders</h2>
      </div>

      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        {orders.filter(o => o.userId === user.id).length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ color: COLORS.textSecondary }}>No orders yet. Hungry?</p>
            <Button onClick={() => setScreen("menu")} style={{ marginTop: 12 }}>Browse Menu</Button>
          </div>
        ) : (
          orders.filter(o => o.userId === user.id).map(order => {
            const statusIdx = ORDER_STATUSES.indexOf(order.status);
            const config = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{order.orderNumber}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <Badge color={config.color} bg={config.bg}>{config.icon} {config.label}</Badge>
                </div>

                {/* Progress Bar */}
                {!["delivered", "cancelled"].includes(order.status) && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      {ORDER_STATUSES.slice(0, -1).map((s, i) => (
                        <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusIdx ? COLORS.accent : COLORS.border, transition: "all 0.5s" }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {["Received", "Accepted", "Cooking", "Ready", "On the way"].map((label, i) => (
                        <span key={label} style={{ fontSize: 9, color: i <= statusIdx ? COLORS.accent : COLORS.textMuted, fontWeight: i === statusIdx ? 700 : 400 }}>{label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.textSecondary, padding: "4px 0" }}>
                    <span>{item.qty}× {item.name}</span>
                    <span>${(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
                  <span style={{ fontWeight: 700, color: COLORS.accent }}>${order.total.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // --- PROFILE ---
  if (screen === "profile") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}` }}>
        <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Profile</h2>
      </div>
      <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 12px" }}>🥟</div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{user.name}</h3>
          <p style={{ margin: "4px 0", color: COLORS.textMuted }}>{user.phone}</p>
        </div>

        {/* Points Card */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #C04D1A)`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1.5 }}>Momo Points</p>
          <p style={{ margin: "8px 0 4px", fontSize: 36, fontWeight: 800 }}>{user.points}</p>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 6, overflow: "hidden", marginTop: 12 }}>
            <div style={{ background: "white", height: "100%", width: `${Math.min(100, (user.points / 1000) * 100)}%`, borderRadius: 8, transition: "width 0.5s" }} />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.7 }}>{Math.max(0, 1000 - user.points)} more for a Free Platter! 🎉</p>
        </div>

        {/* Quick Actions */}
        {[
          { icon: "📋", label: "Order History", action: () => setScreen("tracking") },
          { icon: "📍", label: "Saved Addresses", action: () => {} },
          { icon: "🎟️", label: "My Coupons", action: () => {} },
          { icon: "👥", label: "Refer a Friend (+100 pts)", action: () => {} },
        ].map((item, i) => (
          <div key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
            <span style={{ color: COLORS.textMuted }}>→</span>
          </div>
        ))}

        <Button variant="danger" fullWidth style={{ marginTop: 24 }} onClick={onSwitchView}>Switch to Dashboard</Button>
      </div>
    </div>
  );
}

// ============================================================
// KITCHEN DASHBOARD
// ============================================================
function KitchenDashboard({ orders, setOrders, menu, setMenu, onSwitchView }) {
  const [tab, setTab] = useState("orders"); // orders | menu | analytics
  const [isOpen, setIsOpen] = useState(true);
  const audioRef = useRef(null);

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => ["accepted", "cooking", "ready"].includes(o.status));
  const deliveringOrders = orders.filter(o => o.status === "delivering");
  const completedOrders = orders.filter(o => o.status === "delivered");

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const toggleAvailability = async (productId) => {
    const item = menu.find(p => p.id === productId);
    if (!item) return;
    const { error } = await supabase.from("menu_items").update({ is_available: !item.isAvailable }).eq("id", productId);
    if (!error) {
      setMenu(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p));
    }
  };

  const totalSales = completedOrders.reduce((s, o) => s + o.total, 0);
  const avgOrderValue = completedOrders.length ? totalSales / completedOrders.length : 0;

  const OrderCard = ({ order }) => {
    const config = STATUS_CONFIG[order.status];
    const nextStatus = ORDER_STATUSES[ORDER_STATUSES.indexOf(order.status) + 1];
    const nextConfig = nextStatus ? STATUS_CONFIG[nextStatus] : null;

    return (
      <div style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 18, marginBottom: 10, borderLeft: `4px solid ${config.color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{order.orderNumber}</span>
            <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 10 }}>{order.userName}</span>
          </div>
          <Badge color={config.color} bg={config.bg}>{config.icon} {config.label}</Badge>
        </div>

        {order.items.map((item, i) => (
          <div key={i} style={{ fontSize: 14, color: COLORS.textSecondary, padding: "3px 0" }}>
            <span style={{ fontWeight: 600, color: COLORS.text }}>{item.qty}×</span> {item.name}
          </div>
        ))}

        {order.specialInstructions && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: COLORS.warningDim, borderRadius: 8, fontSize: 12, color: COLORS.warning }}>
            📝 {order.specialInstructions}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
          <div>
            <span style={{ fontWeight: 800, color: COLORS.accent, fontSize: 16 }}>${order.total.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 8 }}>{order.paymentMethod === "cash" ? "💵 Cash" : "💳 Paid"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {order.status === "pending" && (
              <Button variant="danger" size="sm" onClick={() => updateOrderStatus(order.id, "cancelled")}>Reject</Button>
            )}
            {nextStatus && nextStatus !== "delivered" && (
              <Button size="sm" onClick={() => updateOrderStatus(order.id, nextStatus)}>
                {nextConfig.icon} {nextStatus === "accepted" ? "Accept" : nextStatus === "cooking" ? "Start Cooking" : nextStatus === "ready" ? "Mark Ready" : nextStatus === "delivering" ? "Out for Delivery" : nextStatus}
              </Button>
            )}
            {order.status === "delivering" && (
              <Button variant="success" size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>🎉 Mark Delivered</Button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: COLORS.textMuted }}>
          📍 {order.deliveryAddress} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      {/* Dashboard Header */}
      <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>🥟 Kitchen Dashboard</h1>
          <div onClick={() => setIsOpen(!isOpen)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: isOpen ? COLORS.successDim : COLORS.dangerDim, border: `1px solid ${isOpen ? COLORS.success : COLORS.danger}44`, cursor: "pointer" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOpen ? COLORS.success : COLORS.danger }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? COLORS.success : COLORS.danger }}>{isOpen ? "Accepting Orders" : "Kitchen Closed"}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onSwitchView}>← Customer View</Button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "16px 24px" }}>
        {[
          { label: "Pending", value: pendingOrders.length, color: COLORS.warning, icon: "⏳" },
          { label: "Active", value: activeOrders.length, color: COLORS.accent, icon: "🔥" },
          { label: "Delivering", value: deliveringOrders.length, color: COLORS.success, icon: "🛵" },
          { label: "Today's Sales", value: `$${totalSales.toFixed(0)}`, color: COLORS.success, icon: "💰" },
        ].map((stat, i) => (
          <div key={i} style={{ background: COLORS.card, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>{stat.label}</span>
              <span>{stat.icon}</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 24px", display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}` }}>
        {[
          { id: "orders", label: "Orders", count: pendingOrders.length + activeOrders.length },
          { id: "menu", label: "Menu Management" },
          { id: "analytics", label: "Analytics" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "12px 20px", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? COLORS.accent : "transparent"}`, color: tab === t.id ? COLORS.accent : COLORS.textMuted, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {t.label} {t.count > 0 && <span style={{ background: COLORS.accent, color: COLORS.white, borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: 24 }}>
        {tab === "orders" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            {/* Pending Column */}
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLORS.warning, display: "flex", alignItems: "center", gap: 8 }}>
                ⏳ New Orders <span style={{ background: COLORS.warningDim, borderRadius: 10, padding: "2px 10px", fontSize: 12 }}>{pendingOrders.length}</span>
              </h3>
              {pendingOrders.length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", padding: 40 }}>No pending orders</p>}
              {pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
            </div>

            {/* Active Column */}
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLORS.accent, display: "flex", alignItems: "center", gap: 8 }}>
                🔥 In Progress <span style={{ background: COLORS.accentDim, borderRadius: 10, padding: "2px 10px", fontSize: 12 }}>{activeOrders.length + deliveringOrders.length}</span>
              </h3>
              {[...activeOrders, ...deliveringOrders].length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", padding: 40 }}>No active orders</p>}
              {[...activeOrders, ...deliveringOrders].map(o => <OrderCard key={o.id} order={o} />)}
            </div>
          </div>
        )}

        {tab === "menu" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Menu Items</h3>
              <Button size="sm">+ Add Item</Button>
            </div>
            {menu.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 28 }}>{item.image}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                  <p style={{ margin: "2px 0", fontSize: 12, color: COLORS.textMuted }}>${item.price} • {item.category}</p>
                </div>
                <div onClick={() => toggleAvailability(item.id)}
                  style={{ width: 48, height: 26, borderRadius: 13, background: item.isAvailable ? COLORS.success : COLORS.border, cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.white, position: "absolute", top: 2, left: item.isAvailable ? 24 : 2, transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "analytics" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Total Revenue Today</p>
                <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, color: COLORS.success }}>${totalSales.toFixed(2)}</p>
              </div>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Avg Order Value</p>
                <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, color: COLORS.accent }}>${avgOrderValue.toFixed(2)}</p>
              </div>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Orders Completed</p>
                <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, color: COLORS.text }}>{completedOrders.length}</p>
              </div>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Most Popular</p>
                <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 800, color: COLORS.text }}>🥟 Jhol Momo</p>
              </div>
            </div>

            {/* Simple sales chart visualization */}
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
              <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Orders by Hour</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                {[2, 5, 3, 8, 12, 10, 7, 4, 6, 9, 11, 3].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: v * 10, background: `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accent}66)`, borderRadius: "4px 4px 0 0", transition: "height 0.5s" }} />
                    <span style={{ fontSize: 9, color: COLORS.textMuted }}>{10 + i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

// Normalize a DB order row (snake_case) into the shape the UI expects (camelCase)
function normalizeOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    userName: row.user_name,
    items: (row.order_items || []).map(i => ({ id: i.menu_item_id, name: i.name, qty: i.qty, price: Number(i.price) })),
    total: Number(row.total),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    specialInstructions: row.special_instructions,
    deliveryAddress: row.delivery_address,
    lat: row.lat ? Number(row.lat) : null,
    lng: row.lng ? Number(row.lng) : null,
    createdAt: row.created_at,
  };
}

// Normalize a DB menu_item row into the shape the UI expects
function normalizeMenuItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    image: row.image,
    description: row.description,
    prepTime: row.prep_time,
    isAvailable: row.is_available,
  };
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [user, setUser] = useState(null); // { id, name, phone, points }
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session
  const [view, setView] = useState("customer"); // customer | dashboard
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);

  // 1. Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setUser({ id: userId, name: data.name, phone: data.phone, points: data.points || 0 });
    } else {
      // Profile not created yet (will happen after name step)
      setUser(null);
    }
  };

  // 2. Load menu from DB
  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from("menu_items").select("*").order("created_at");
      if (data) setMenu(data.map(normalizeMenuItem));
    };
    fetchMenu();
  }, []);

  // 3. Load orders from DB when user is set
  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (data) setOrders(data.map(normalizeOrder));
    };
    fetchOrders();
  }, [user]);

  // 4. Real-time subscription for orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, async (payload) => {
        // Fetch the full order with items
        const { data } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          setOrders(prev => {
            if (prev.some(o => o.id === data.id)) return prev;
            return [normalizeOrder(data), ...prev];
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders(prev => prev.map(o =>
          o.id === payload.new.id ? { ...o, status: payload.new.status } : o
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥟</div>
          <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <AuthView onLogin={() => {
      // Session is already set by onAuthStateChange; just reload profile
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (u) loadProfile(u.id);
      });
    }} />;
  }

  if (view === "dashboard") {
    return <KitchenDashboard orders={orders} setOrders={setOrders} menu={menu} setMenu={setMenu} onSwitchView={() => setView("customer")} />;
  }

  return <CustomerApp user={user} orders={orders} setOrders={setOrders} menu={menu} onSwitchView={() => setView("dashboard")} />;
}
