import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./src/supabaseClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  UtensilsCrossed, Utensils, Flame, Wind, Droplets, Zap,
  Clock, CheckCircle, Package, Truck, CircleCheck, XCircle,
  Phone, User, Users, Star, Home, MapPin, Map, CreditCard, Banknote,
  Settings, ArrowLeft, ChevronRight, ClipboardList, Ticket, Gift,
  MessageSquare, Inbox, DollarSign, Plus, Minus, ShoppingCart,
  LayoutGrid, Leaf, BarChart3, TrendingUp, CircleDot, Camera, Navigation, Bell, Volume2, VolumeX,
} from "lucide-react";

// ============================================================
// MOMO ORDER - Home Kitchen Ordering Platform
// ============================================================

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Map menu item category to an icon component
const CATEGORY_ICON = {
  steamed: Wind,
  fried: Flame,
  jhol: Droplets,
  c_momo: Zap,
};

function MenuItemIcon({ category, size = 28, color }) {
  const Icon = CATEGORY_ICON[category] || UtensilsCrossed;
  return <Icon size={size} color={color} strokeWidth={1.5} />;
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

const COLORS = {
  bg: "#0A0A0A",
  surface: "#141414",
  surfaceHover: "#1C1C1C",
  card: "#181818",
  cardHover: "#202020",
  border: "#2A2A2A",
  borderLight: "#333333",
  accent: "#FFFFFF",
  accentHover: "#E0E0E0",
  accentDim: "rgba(255,255,255,0.07)",
  accentGlow: "rgba(255,255,255,0.12)",
  success: "#10B981",
  successDim: "rgba(16,185,129,0.10)",
  warning: "#F59E0B",
  warningDim: "rgba(245,158,11,0.10)",
  danger: "#EF4444",
  dangerDim: "rgba(239,68,68,0.10)",
  text: "#F0F0F0",
  textSecondary: "#8A8A8A",
  textMuted: "#555555",
  white: "#FFFFFF",
};

// Inject driver pulse animation
if (!document.getElementById("momoghar-styles")) {
  const s = document.createElement("style");
  s.id = "momoghar-styles";
  s.textContent = `@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.5)}70%{box-shadow:0 0 0 12px rgba(59,130,246,0)}}`;
  document.head.appendChild(s);
}

// Smooth marker animation helper
function animateMarker(marker, targetLat, targetLng, duration = 1000) {
  const start = marker.getLatLng();
  const startTime = performance.now();
  const dLat = targetLat - start.lat;
  const dLng = targetLng - start.lng;
  if (Math.abs(dLat) < 0.000001 && Math.abs(dLng) < 0.000001) return;
  const step = (now) => {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
    marker.setLatLng([start.lat + dLat * ease, start.lng + dLng * ease]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ============================================================
// DATA
// ============================================================
const CATEGORIES = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "steamed", label: "Steamed", Icon: Wind },
  { id: "fried", label: "Fried", Icon: Flame },
  { id: "jhol", label: "Jhol", Icon: Droplets },
  { id: "c_momo", label: "C-Momo", Icon: Zap },
];

const ORDER_STATUSES = ["pending", "accepted", "cooking", "ready", "delivering", "delivered"];

const STATUS_CONFIG = {
  pending: { label: "Pending", color: COLORS.warning, bg: COLORS.warningDim, Icon: Clock },
  accepted: { label: "Accepted", color: "#60A5FA", bg: "rgba(96,165,250,0.10)", Icon: CheckCircle },
  cooking: { label: "Cooking", color: COLORS.warning, bg: COLORS.warningDim, Icon: Flame },
  ready: { label: "Ready", color: COLORS.success, bg: COLORS.successDim, Icon: Package },
  delivering: { label: "Out for Delivery", color: COLORS.success, bg: COLORS.successDim, Icon: Truck },
  delivered: { label: "Delivered", color: COLORS.success, bg: COLORS.successDim, Icon: CircleCheck },
  cancelled: { label: "Cancelled", color: COLORS.danger, bg: COLORS.dangerDim, Icon: XCircle },
};

const generateOrderNumber = () => `MOMO-${String(Math.floor(1000 + Math.random() * 9000))}`;

// ============================================================
// COMPONENTS: Shared
// ============================================================

function Badge({ children, color, bg, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, color: color || COLORS.accent, background: bg || COLORS.accentDim, letterSpacing: 0.4, ...style }}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", disabled, style, fullWidth }) {
  const base = { border: "none", borderRadius: 12, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.5 : 1, width: fullWidth ? "100%" : "auto" };
  const sizes = { sm: { padding: "8px 14px", fontSize: 13 }, md: { padding: "12px 20px", fontSize: 14 }, lg: { padding: "16px 28px", fontSize: 15 } };
  const variants = {
    primary: { background: COLORS.accent, color: COLORS.bg },
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
        style={{ width: "100%", padding: icon ? "14px 16px 14px 42px" : "14px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", ...style }}
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
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [error, setError] = useState("");
  const inputRefs = Array.from({ length: OTP_LENGTH }, () => useRef(null));

  const handleSendOTP = () => {
    if (phone.length < 10) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    setStep("otp");
  };

  const handleVerify = async () => {
    const token = otp.join("");
    if (token.length < OTP_LENGTH) return;

    if (token !== generatedOtp) {
      setError("Incorrect code. Please try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs[0].current?.focus();
      return;
    }

    // Check Supabase for existing user by phone
    const { data: existing } = await supabase.from("users").select("*").eq("phone", phone).single();
    if (existing) {
      const userData = { id: existing.id, name: existing.name, phone: existing.phone, points: existing.points || 0, avatar: existing.avatar || null, address: existing.address || "", addressLat: existing.address_lat || null, addressLng: existing.address_lng || null };
      localStorage.setItem("momoghar_user", JSON.stringify(userData));
      onLogin(userData);
      return;
    }

    // Fallback: check localStorage
    const saved = localStorage.getItem("momoghar_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.phone === phone) {
        onLogin(parsed);
        return;
      }
    }
    setStep("name");
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
    const userData = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone,
      points: 0,
    };
    // Save to Supabase
    await supabase.from("users").insert({ id: userData.id, name: userData.name, phone: userData.phone, points: 0 });
    localStorage.setItem("momoghar_user", JSON.stringify(userData));
    onLogin(userData);
  };

  useEffect(() => {
    if (step === "otp") inputRefs[0].current?.focus();
  }, [step]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><UtensilsCrossed size={48} color={COLORS.accent} strokeWidth={1.5} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, margin: 0, letterSpacing: -0.5 }}>MomoGhar</h1>
        <p style={{ color: COLORS.textSecondary, margin: "8px 0 40px", fontSize: 14, letterSpacing: 0.5 }}>Homemade Nepali Momos • Fresh to Your Door</p>

        <div style={{ background: COLORS.card, borderRadius: 16, padding: "32px 24px", border: `1px solid ${COLORS.border}` }}>
          {step === "phone" && (
            <>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 20px" }}>Enter your phone number to get started</p>
              <Input value={phone} onChange={setPhone} placeholder="+16470000000" icon={<Phone size={16} />} type="tel" />
              <Button onClick={handleSendOTP} fullWidth style={{ marginTop: 16 }} disabled={phone.length < 10}>
                Send OTP
              </Button>
            </>
          )}
          {step === "otp" && (
            <>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 12px" }}>Enter the 6-digit code sent to {phone}</p>

              {/* Dev mode: show OTP on screen */}
              <div style={{ margin: "0 0 20px", padding: "10px 16px", background: COLORS.accentDim, border: `1px solid ${COLORS.accent}44`, borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={14} color={COLORS.textSecondary} />
                <span style={{ color: COLORS.text, fontWeight: 700 }}>Your code: <span style={{ color: COLORS.accent, letterSpacing: 2, fontSize: 16 }}>{generatedOtp}</span></span>
              </div>

              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    maxLength={1}
                    inputMode="numeric"
                    style={{ width: 40, height: 50, textAlign: "center", fontSize: 20, fontWeight: 600, background: COLORS.surface, border: `2px solid ${otp[i] ? COLORS.accent : error ? COLORS.danger : COLORS.border}`, borderRadius: 12, color: COLORS.text, outline: "none", fontFamily: "inherit", transition: "border-color 0.2s", flex: "0 1 44px" }}
                    value={otp[i]}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={e => { e.preventDefault(); handleOtpChange(i, e.clipboardData.getData("text")); }}
                  />
                ))}
              </div>

              {error && <p style={{ color: COLORS.danger, fontSize: 13, margin: "0 0 12px", fontWeight: 600 }}>{error}</p>}

              <Button onClick={handleVerify} fullWidth disabled={otp.join("").length < OTP_LENGTH} style={{ marginTop: 8 }}>
                Verify Code
              </Button>
              <button onClick={handleSendOTP} style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 13, cursor: "pointer", marginTop: 12, fontFamily: "inherit" }}>Resend Code</button>
            </>
          )}
          {step === "name" && (
            <>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 20px" }}>What should we call you?</p>
              <Input value={name} onChange={setName} placeholder="Your name" icon={<User size={16} />} />
              <Button onClick={handleComplete} fullWidth style={{ marginTop: 16 }} disabled={!name.trim()}>
                Start Ordering
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- DELIVERY MAP ---
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon paths (broken by bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FullScreenMap({ open, onClose, initialLat, initialLng, onConfirm }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const searchTimeout = useRef(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const selectedLatLng = useRef({ lat: initialLat, lng: initialLng });

  // Initialize map when overlay opens
  useEffect(() => {
    if (!open) return;
    // Small delay so the DOM element is rendered
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("click", (e) => {
        placeMarker(map, e.latlng.lat, e.latlng.lng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open]);

  const placeMarker = (map, lat, lng) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        reverseGeocode(pos.lat, pos.lng);
      });
    }
    selectedLatLng.current = { lat, lng };
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await res.json();
      if (data.display_name) {
        setSelectedAddress(data.display_name);
        selectedLatLng.current = { lat, lng };
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
    }
  };

  const searchAddress = async (q) => {
    if (q.length < 3) { setResults([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&countrycodes=ca`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleInputChange = (val) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddress(val), 400);
  };

  const selectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const map = mapInstanceRef.current;
    map.setView([lat, lng], 16);
    placeMarker(map, lat, lng);
    setSelectedAddress(item.display_name);
    setQuery("");
    setResults([]);
  };

  const handleConfirm = () => {
    onConfirm(selectedAddress, selectedLatLng.current.lat, selectedLatLng.current.lng);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, background: COLORS.bg,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface,
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: COLORS.text, cursor: "pointer",
          padding: 4, display: "flex",
        }}>
          <XCircle size={22} />
        </button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>Set Delivery Location</h2>
      </div>

      {/* Search bar */}
      <div style={{ padding: "12px 16px", position: "relative", background: COLORS.surface }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>
            <MapPin size={16} color={COLORS.textMuted} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search for your address..."
            autoFocus
            style={{
              width: "100%", padding: "12px 16px 12px 42px", background: COLORS.bg,
              border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text,
              fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Search results dropdown */}
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 16, right: 16, zIndex: 110,
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10,
            marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          }}>
            {results.map((item, i) => (
              <div
                key={i}
                onClick={() => selectResult(item)}
                style={{
                  padding: "12px 14px", cursor: "pointer", fontSize: 13,
                  color: COLORS.text, borderBottom: i < results.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}
              >
                <MapPin size={14} color={COLORS.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.4 }}>{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map fills remaining space */}
      <div ref={mapRef} style={{ flex: 1, position: "relative", zIndex: 1 }} />

      {/* Bottom bar with selected address + confirm */}
      <div style={{
        padding: "14px 16px", background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
      }}>
        {selectedAddress && (
          <p style={{
            margin: "0 0 10px", fontSize: 13, color: COLORS.textSecondary,
            display: "flex", alignItems: "flex-start", gap: 6, lineHeight: 1.4,
          }}>
            <MapPin size={14} color={COLORS.accent} style={{ flexShrink: 0, marginTop: 2 }} />
            {selectedAddress}
          </p>
        )}
        <Button
          onClick={handleConfirm}
          fullWidth
          disabled={!selectedAddress}
        >
          <CheckCircle size={16} /> Confirm Location
        </Button>
      </div>
    </div>
  );
}

// --- STRIPE PAYMENT SHEET ---
function CheckoutForm({ amount, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, background: COLORS.bg,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface,
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
      }}>
        <button onClick={onClose} disabled={processing} style={{
          background: "none", border: "none", color: COLORS.text, cursor: "pointer",
          padding: 4, display: "flex", opacity: processing ? 0.5 : 1,
        }}>
          <XCircle size={22} />
        </button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>Payment</h2>
        <Badge><CreditCard size={12} /> ${(amount / 100).toFixed(2)}</Badge>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          <PaymentElement options={{
            layout: "tabs",
          }} />
        </div>

        <div style={{
          padding: "14px 16px", background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
        }}>
          {error && (
            <p style={{
              margin: "0 0 10px", fontSize: 13, color: COLORS.danger,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <XCircle size={14} /> {error}
            </p>
          )}
          <Button
            onClick={handleSubmit}
            fullWidth
            disabled={!stripe || processing}
            style={{ opacity: processing ? 0.7 : 1 }}
          >
            {processing ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StripePaymentSheet({ open, clientSecret, amount, onSuccess, onClose }) {
  if (!open || !clientSecret || !stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{
      clientSecret,
      appearance: {
        theme: "night",
        variables: {
          colorPrimary: COLORS.accent,
          colorBackground: COLORS.surface,
          colorText: COLORS.text,
          colorDanger: COLORS.danger,
          borderRadius: "12px",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        },
      },
    }}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} onClose={onClose} />
    </Elements>
  );
}

// --- ORDER TRACKING MAP ---
const KITCHEN_LOCATION = { lat: 43.6532, lng: -79.3832 };

function OrderTrackingMap({ order }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [eta, setEta] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [driverLive, setDriverLive] = useState(false);
  const etaFetchRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || !order.lat || !order.lng) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      driverMarkerRef.current = null;
      routeLineRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Kitchen marker
    const kitchenIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;background:${COLORS.accent};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid ${COLORS.border};box-shadow:0 2px 8px rgba(0,0,0,0.5)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${COLORS.bg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    // Customer marker (green)
    const customerIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;background:${COLORS.success};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid ${COLORS.white};box-shadow:0 2px 8px rgba(0,0,0,0.5)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    L.marker([KITCHEN_LOCATION.lat, KITCHEN_LOCATION.lng], { icon: kitchenIcon }).addTo(map);
    L.marker([order.lat, order.lng], { icon: customerIcon }).addTo(map);

    const bounds = L.latLngBounds(
      [KITCHEN_LOCATION.lat, KITCHEN_LOCATION.lng],
      [order.lat, order.lng]
    );
    map.fitBounds(bounds, { padding: [60, 60] });

    // Fetch initial driving route (kitchen → customer)
    fetch(`https://router.project-osrm.org/route/v1/driving/${KITCHEN_LOCATION.lng},${KITCHEN_LOCATION.lat};${order.lng},${order.lat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          routeLineRef.current = L.polyline(coords, {
            color: COLORS.accent,
            weight: 4,
            opacity: 0.85,
            dashArray: order.status === "delivering" ? null : "8, 12",
          }).addTo(map);
          setEta(Math.round(route.duration / 60));
          setRouteDistance((route.distance / 1000).toFixed(1));
        }
      })
      .catch(() => {});

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, [order.id, order.lat, order.lng, order.status]);

  // Update driver marker when driverLat/driverLng changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !order.driverLat || !order.driverLng) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      setDriverLive(false);
      return;
    }

    setDriverLive(true);
    const driverIcon = L.divIcon({
      className: "",
      html: `<div style="width:40px;height:40px;background:#3B82F6;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid ${COLORS.white};box-shadow:0 2px 12px rgba(59,130,246,0.6);animation:pulse 2s infinite"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 12 16 16"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/></svg></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    if (driverMarkerRef.current) {
      animateMarker(driverMarkerRef.current, order.driverLat, order.driverLng);
    } else {
      driverMarkerRef.current = L.marker([order.driverLat, order.driverLng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
    }

    // Update route line from driver to customer and recalculate ETA
    clearTimeout(etaFetchRef.current);
    etaFetchRef.current = setTimeout(() => {
      fetch(`https://router.project-osrm.org/route/v1/driving/${order.driverLng},${order.driverLat};${order.lng},${order.lat}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            if (routeLineRef.current) routeLineRef.current.remove();
            routeLineRef.current = L.polyline(coords, {
              color: "#3B82F6",
              weight: 4,
              opacity: 0.9,
            }).addTo(map);
            setEta(Math.round(route.duration / 60));
            setRouteDistance((route.distance / 1000).toFixed(1));
          }
        })
        .catch(() => {});
    }, 1000);

    // Fit bounds to include driver
    const bounds = L.latLngBounds(
      [order.driverLat, order.driverLng],
      [order.lat, order.lng]
    );
    map.fitBounds(bounds, { padding: [60, 60], animate: true });
  }, [order.driverLat, order.driverLng]);

  if (!order.lat || !order.lng) return null;

  const getEtaInfo = () => {
    const drive = eta || 10;
    switch (order.status) {
      case "pending": return { time: drive + 25, label: "Estimated delivery" };
      case "accepted": return { time: drive + 20, label: "Preparing your order" };
      case "cooking": return { time: drive + 12, label: "Cooking your momos" };
      case "ready": return { time: drive + 3, label: "Ready for pickup" };
      case "delivering": return { time: driverLive ? drive : drive, label: driverLive ? "Driver arriving in" : "Arriving in" };
      default: return null;
    }
  };

  const etaInfo = getEtaInfo();

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
      <div ref={mapRef} style={{ height: 300, width: "100%" }} />

      {/* ETA overlay */}
      {etaInfo && (
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 10,
          background: `${COLORS.card}ee`, borderRadius: 12, padding: "10px 14px",
          border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
        }}>
          <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{etaInfo.label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, color: COLORS.text }}>
            {etaInfo.time} <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>min</span>
          </p>
          {routeDistance && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>{routeDistance} km</p>
          )}
        </div>
      )}

      {/* Status pill */}
      {(() => {
        const config = STATUS_CONFIG[order.status];
        return (
          <div style={{
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10,
            background: `${COLORS.card}ee`, borderRadius: 20, padding: "6px 14px",
            border: `1px solid ${config.color}44`, display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: config.color }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: config.color }}>{config.label}</span>
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 10,
        background: `${COLORS.card}ee`, borderRadius: 10, padding: "8px 10px",
        border: `1px solid ${COLORS.border}`, backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.textSecondary }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accent }} /> Kitchen
        </div>
        {driverLive && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.textSecondary }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3B82F6" }} /> Driver
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.textSecondary }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.success }} /> You
        </div>
      </div>
    </div>
  );
}

// --- BOTTOM NAV ---
const NAV_HEIGHT = 64;

function BottomNav({ active, onNavigate, cartCount }) {
  const tabs = [
    { id: "menu", label: "Home", Icon: UtensilsCrossed },
    { id: "tracking", label: "Orders", Icon: ClipboardList },
    { id: "cart", label: "Cart", Icon: ShoppingCart, badge: cartCount },
    { id: "profile", label: "Profile", Icon: User },
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      zIndex: 50,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onNavigate(tab.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "none", border: "none", cursor: "pointer", padding: "8px 0",
              color: isActive ? COLORS.accent : COLORS.textMuted, fontFamily: "inherit",
              position: "relative", transition: "color 0.2s",
            }}>
            <div style={{ position: "relative" }}>
              <tab.Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
              {tab.badge > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -10,
                  background: COLORS.accent, color: COLORS.bg,
                  fontSize: 10, fontWeight: 700, borderRadius: 10,
                  minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px",
                }}>{tab.badge}</span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// --- CUSTOMER APP ---
function CustomerApp({ user, orders, setOrders, menu, storeOpen }) {
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [screen, setScreen] = useState("menu"); // menu | cart | tracking | profile
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(user.address || "");
  const [deliveryLat, setDeliveryLat] = useState(user.addressLat || 43.6532);
  const [deliveryLng, setDeliveryLng] = useState(user.addressLng || -79.3832);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mapOpen, setMapOpen] = useState(false);
  const [profileMapOpen, setProfileMapOpen] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeSheetOpen, setStripeSheetOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");

  const syncUser = async (updates) => {
    const { error } = await supabase.from("users").upsert({ id: user.id, name: user.name, phone: user.phone, points: user.points || 0, ...updates }, { onConflict: "id" });
    if (error) console.error("syncUser error:", error);
  };

  const saveUserAddress = (addr, lat, lng) => {
    const updated = { ...user, address: addr, addressLat: lat, addressLng: lng };
    localStorage.setItem("momoghar_user", JSON.stringify(updated));
    syncUser({ address: addr, address_lat: lat, address_lng: lng });
  };

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

  const insertOrder = async (paymentStatus = "pending", stripePaymentIntentId = null) => {
    const orderNumber = generateOrderNumber();
    const { data: order, error } = await supabase.from("orders").insert({
      order_number: orderNumber,
      user_id: user.id,
      user_name: user.name,
      total: cartTotal + deliveryFee,
      status: "pending",
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      special_instructions: specialInstructions,
      delivery_address: deliveryAddress,
      lat: deliveryLat,
      lng: deliveryLng,
    }).select().single();

    if (error) {
      setOrderError(error.message || "Failed to place order");
      setOrderLoading(false);
      return;
    }

    await supabase.from("order_items").insert(
      cart.map(c => ({ order_id: order.id, menu_item_id: c.id, name: c.name, qty: c.qty, price: c.price }))
    );

    const { data: fullOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order.id)
      .single();

    if (fullOrder) {
      setOrders(prev => [normalizeOrder(fullOrder), ...prev]);
    }

    // Award points: 10 points per dollar spent
    const earned = Math.floor((cartTotal + deliveryFee) * 10);
    const newPoints = (user.points || 0) + earned;
    const updated = { ...user, points: newPoints };
    localStorage.setItem("momoghar_user", JSON.stringify(updated));
    Object.assign(user, updated);
    syncUser({ points: newPoints });

    setCart([]);
    setSpecialInstructions("");
    setOrderLoading(false);
    setScreen("tracking");
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setOrderError("");
    setOrderLoading(true);

    if (paymentMethod === "cash") {
      await insertOrder("pending");
      return;
    }

    // Stripe card payment
    const amountInCents = Math.round((cartTotal + deliveryFee) * 100);
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountInCents }),
      });
      const data = await res.json();
      if (data.error) {
        setOrderError(data.error);
        setOrderLoading(false);
        return;
      }
      setStripeClientSecret(data.clientSecret);
      setStripeSheetOpen(true);
      setOrderLoading(false);
    } catch (err) {
      setOrderError("Payment failed. Please try again.");
      setOrderLoading(false);
    }
  };

  const handleStripeSuccess = async (paymentIntentId) => {
    setStripeSheetOpen(false);
    setStripeClientSecret("");
    await insertOrder("paid", paymentIntentId);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  // --- MENU SCREEN ---
  if (screen === "menu") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><UtensilsCrossed size={20} color={COLORS.accent} strokeWidth={1.5} /> MomoGhar</h1>
          <p style={{ margin: 0, fontSize: 12, color: storeOpen ? COLORS.textMuted : COLORS.danger }}>{storeOpen ? "Open • Delivery in ~30 min" : "Currently Closed"}</p>
        </div>
        <Badge color={COLORS.accent} bg={COLORS.accentDim}><Star size={12} /> {user.points} pts</Badge>
      </div>

      {!storeOpen && (
        <div style={{ margin: "12px 20px", padding: "12px 16px", background: COLORS.dangerDim, border: `1px solid ${COLORS.danger}33`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <Clock size={16} color={COLORS.danger} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.danger }}>Store is closed</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.textMuted }}>You can browse the menu but ordering is unavailable right now</p>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="hide-scrollbar" style={{ padding: "8px 20px", display: "flex", gap: 8, overflowX: "auto" }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{ padding: "8px 16px", borderRadius: 10, border: activeCategory === cat.id ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: activeCategory === cat.id ? COLORS.accentDim : "transparent", color: activeCategory === cat.id ? COLORS.accent : COLORS.textSecondary, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <cat.Icon size={14} /> {cat.label}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12, paddingBottom: NAV_HEIGHT + 24 }}>
        {filteredItems.map(item => {
          const inCart = cart.find(c => c.id === item.id);
          return (
            <div key={item.id} style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden", opacity: item.isAvailable ? 1 : 0.5, transition: "all 0.2s" }}>
              <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MenuItemIcon category={item.category} size={24} color={COLORS.accent} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{item.name}</h3>
                    <span style={{ fontWeight: 600, color: COLORS.accent, fontSize: 15 }}>${item.price}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4 }}>{item.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {item.prepTime} min</span>
                    {!item.isAvailable ? (
                      <Badge color={COLORS.danger} bg={COLORS.dangerDim}>Sold Out</Badge>
                    ) : inCart ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={14} /></button>
                        <span style={{ fontWeight: 600, fontSize: 14, minWidth: 20, textAlign: "center" }}>{inCart.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={14} /></button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(item)}><Plus size={14} /> Add</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav active="menu" onNavigate={setScreen} cartCount={cartCount} />
    </div>
  );

  // --- CART SCREEN ---
  if (screen === "cart") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Your Cart</h2>
        <Badge>{cart.length} items</Badge>
      </div>

      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        {/* Cart Items */}
        {cart.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MenuItemIcon category={item.category} size={18} color={COLORS.accent} /></div>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>{item.name}</p>
                <p style={{ margin: "2px 0 0", color: COLORS.textMuted, fontSize: 13 }}>${item.price} each</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => updateQty(item.id, -1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={14} /></button>
              <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => updateQty(item.id, 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={14} /></button>
            </div>
          </div>
        ))}

        {/* Payment Method */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 8 }}>Payment Method</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ id: "cash", label: "Cash", desc: "Pay on delivery", Icon: Banknote }, { id: "stripe", label: "Card", desc: "Pay now via Stripe", Icon: CreditCard }].map(pm => (
              <div key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${paymentMethod === pm.id ? COLORS.accent : COLORS.border}`, background: paymentMethod === pm.id ? COLORS.accentDim : COLORS.surface, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><pm.Icon size={16} /> {pm.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>{pm.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ marginTop: 24, padding: 20, background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: COLORS.textSecondary, fontSize: 14 }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>${cartTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: COLORS.textSecondary, fontSize: 14 }}>Delivery {cartTotal >= 25 && <Badge color={COLORS.success} bg={COLORS.successDim} style={{ fontSize: 10 }}>FREE</Badge>}</span>
            <span style={{ fontWeight: 600, color: deliveryFee === 0 ? COLORS.success : COLORS.text }}>{deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}</span>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: COLORS.accent }}>${(cartTotal + deliveryFee).toFixed(2)}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.success, display: "flex", alignItems: "center", gap: 4 }}><Gift size={12} /> You'll earn {Math.floor((cartTotal + deliveryFee) * 10)} points with this order!</p>
        </div>

        {/* Delivery Address */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><MapPin size={13} /> Delivery Address</label>
          <div
            onClick={() => setMapOpen(true)}
            style={{
              width: "100%", padding: "12px 16px 12px 42px", background: COLORS.surface,
              border: `1px solid ${COLORS.border}`, borderRadius: 10, color: deliveryAddress ? COLORS.text : COLORS.textMuted,
              fontSize: 14, fontFamily: "inherit", cursor: "pointer", position: "relative",
              minHeight: 44, display: "flex", alignItems: "center",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>
              <MapPin size={16} color={COLORS.textMuted} />
            </span>
            {deliveryAddress || "Tap to set delivery location"}
          </div>
        </div>

        <FullScreenMap
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          initialLat={deliveryLat}
          initialLng={deliveryLng}
          onConfirm={(addr, lat, lng) => { setDeliveryAddress(addr); setDeliveryLat(lat); setDeliveryLng(lng); saveUserAddress(addr, lat, lng); }}
        />

        <StripePaymentSheet
          open={stripeSheetOpen}
          clientSecret={stripeClientSecret}
          amount={Math.round((cartTotal + deliveryFee) * 100)}
          onSuccess={handleStripeSuccess}
          onClose={() => { setStripeSheetOpen(false); setStripeClientSecret(""); }}
        />

        {/* Special Instructions */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 8 }}>Special Instructions</label>
          <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Extra spicy chutney, no onions, etc." rows={2}
            style={{ width: "100%", padding: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, fontSize: 14, fontFamily: "inherit", resize: "none", boxSizing: "border-box", outline: "none" }} />
        </div>

        {orderError && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: COLORS.danger, display: "flex", alignItems: "center", gap: 6 }}>
            <XCircle size={14} /> {orderError}
          </p>
        )}

        <Button onClick={placeOrder} fullWidth size="lg" disabled={cart.length === 0 || orderLoading || !deliveryAddress || !storeOpen} style={{ marginTop: 16, marginBottom: NAV_HEIGHT + 16 }}>
          {!storeOpen ? <><XCircle size={16} /> Store is Closed</> : orderLoading ? "Processing..." : !deliveryAddress ? <><MapPin size={16} /> Set Delivery Location</> : <><ShoppingCart size={16} /> Place Order</>}
        </Button>
      </div>
      <BottomNav active="cart" onNavigate={setScreen} cartCount={cartCount} />
    </div>
  );

  // --- ORDER TRACKING ---
  if (screen === "tracking") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.bg, zIndex: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>My Orders</h2>
      </div>

      <div style={{ padding: 20, paddingBottom: NAV_HEIGHT + 24, maxWidth: 600, margin: "0 auto" }}>
        {/* Live tracking map for the most recent active order */}
        {(() => {
          const activeOrder = orders.find(o => o.userId === user.id && !["delivered", "cancelled"].includes(o.status));
          return activeOrder ? <OrderTrackingMap order={activeOrder} /> : null;
        })()}

        {orders.filter(o => o.userId === user.id).length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ marginBottom: 12 }}><Inbox size={48} color={COLORS.textMuted} /></div>
            <p style={{ color: COLORS.textSecondary }}>No orders yet. Hungry?</p>
            <Button onClick={() => setScreen("menu")} style={{ marginTop: 12 }}>Browse Menu</Button>
          </div>
        ) : (
          orders.filter(o => o.userId === user.id).map(order => {
            const statusIdx = ORDER_STATUSES.indexOf(order.status);
            const config = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{order.orderNumber}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <Badge color={config.color} bg={config.bg}><config.Icon size={12} /> {config.label}</Badge>
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
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Total</span>
                  <span style={{ fontWeight: 600, color: COLORS.accent }}>${order.total.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNav active="tracking" onNavigate={setScreen} cartCount={cartCount} />
    </div>
  );

  // --- PROFILE ---
  if (screen === "profile") return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}` }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Profile</h2>
      </div>
      <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 12px", cursor: "pointer" }} onClick={() => document.getElementById("avatar-input").click()}>
            {user.avatar ? (
              <img src={user.avatar} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={36} color={COLORS.accent} /></div>
            )}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${COLORS.bg}` }}>
              <Camera size={12} color={COLORS.bg} />
            </div>
            <input id="avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const size = 200;
                  canvas.width = size;
                  canvas.height = size;
                  const ctx = canvas.getContext("2d");
                  const min = Math.min(img.width, img.height);
                  const sx = (img.width - min) / 2;
                  const sy = (img.height - min) / 2;
                  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                  const updated = { ...user, avatar: dataUrl };
                  localStorage.setItem("momoghar_user", JSON.stringify(updated));
                  syncUser({ avatar: dataUrl });
                  window.location.reload();
                };
                img.src = reader.result;
              };
              reader.readAsDataURL(file);
              e.target.value = "";
            }} />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{user.name}</h3>
          <p style={{ margin: "4px 0", color: COLORS.textMuted }}>{user.phone}</p>
        </div>

        {/* Points Card */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.border}, ${COLORS.surface})`, border: `1px solid ${COLORS.borderLight}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1.5 }}>Momo Points</p>
          <p style={{ margin: "8px 0 4px", fontSize: 32, fontWeight: 700 }}>{user.points}</p>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 6, overflow: "hidden", marginTop: 12 }}>
            <div style={{ background: "white", height: "100%", width: `${Math.min(100, (user.points / 1000) * 100)}%`, borderRadius: 8, transition: "width 0.5s" }} />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.7 }}>{Math.max(0, 1000 - user.points)} more for a Free Platter!</p>
        </div>

        {/* Saved Address */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><MapPin size={13} /> Delivery Address</p>
          <div
            onClick={() => setProfileMapOpen(true)}
            style={{ padding: 14, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
          >
            <MapPin size={18} color={deliveryAddress ? COLORS.accent : COLORS.textMuted} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, color: deliveryAddress ? COLORS.text : COLORS.textMuted, lineHeight: 1.4 }}>
              {deliveryAddress || "Tap to set your delivery address"}
            </span>
            <ChevronRight size={16} color={COLORS.textMuted} />
          </div>
        </div>

        <FullScreenMap
          open={profileMapOpen}
          onClose={() => setProfileMapOpen(false)}
          initialLat={deliveryLat}
          initialLng={deliveryLng}
          onConfirm={(addr, lat, lng) => { setDeliveryAddress(addr); setDeliveryLat(lat); setDeliveryLng(lng); saveUserAddress(addr, lat, lng); }}
        />

        {/* Quick Actions */}
        {[
          { Icon: ClipboardList, label: "Order History", action: () => setScreen("tracking") },
        ].map((item, i) => (
          <div key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
            <item.Icon size={20} color={COLORS.textSecondary} />
            <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
            <ChevronRight size={16} color={COLORS.textMuted} />
          </div>
        ))}

        <Button variant="danger" fullWidth style={{ marginTop: 24, marginBottom: NAV_HEIGHT + 16 }} onClick={() => {
          localStorage.removeItem("momoghar_user");
          window.location.reload();
        }}>Log Out</Button>
      </div>
      <BottomNav active="profile" onNavigate={setScreen} cartCount={cartCount} />
    </div>
  );
}

// ============================================================
// DASHBOARD LOGIN
// ============================================================
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || "momoghar123";

function DashboardLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === DASHBOARD_PASSWORD) {
      sessionStorage.setItem("dashboard_auth", "true");
      onLogin();
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><UtensilsCrossed size={48} color={COLORS.accent} strokeWidth={1.5} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, margin: 0, letterSpacing: -0.5 }}>MomoGhar</h1>
        <p style={{ color: COLORS.textSecondary, margin: "8px 0 40px", fontSize: 15, letterSpacing: 0.5 }}>Kitchen Dashboard</p>

        <div style={{ background: COLORS.card, borderRadius: 16, padding: "28px 20px", border: `1px solid ${COLORS.border}` }}>
          <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: "0 0 20px" }}>Enter owner password to continue</p>
          <Input
            value={password}
            onChange={(val) => { setPassword(val); setError(""); }}
            placeholder="Password"
            type="password"
            icon={<Settings size={16} />}
          />
          {error && <p style={{ color: COLORS.danger, fontSize: 13, margin: "10px 0 0", fontWeight: 600 }}>{error}</p>}
          <Button onClick={handleLogin} fullWidth style={{ marginTop: 16 }} disabled={!password}>
            <Settings size={16} /> Access Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DRIVER NAVIGATION MAP (Uber-style)
// ============================================================
function DriverNavMap({ order, onDelivered, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const watchIdRef = useRef(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const etaTimeout = useRef(null);

  // Start GPS and init map
  useEffect(() => {
    if (!mapRef.current || !order.lat || !order.lng) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    // Customer marker
    const customerIcon = L.divIcon({
      className: "",
      html: `<div style="width:40px;height:40px;background:${COLORS.success};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid ${COLORS.white};box-shadow:0 2px 12px rgba(0,0,0,0.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
    L.marker([order.lat, order.lng], { icon: customerIcon }).addTo(map);

    map.setView([order.lat, order.lng], 14);
    mapInstanceRef.current = map;

    // Start GPS tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPos({ lat, lng });
        supabase.from("orders").update({ driver_lat: lat, driver_lng: lng }).eq("id", order.id).then();

        // Driver marker
        const driverIcon = L.divIcon({
          className: "",
          html: `<div style="width:44px;height:44px;background:#3B82F6;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid ${COLORS.white};box-shadow:0 2px 12px rgba(59,130,246,0.6);animation:pulse 2s infinite"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 19 21 12 17 5 21"/></svg></div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        if (driverMarkerRef.current) {
          animateMarker(driverMarkerRef.current, lat, lng);
        } else {
          driverMarkerRef.current = L.marker([lat, lng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
        }

        // Fit bounds (smooth pan)
        const bounds = L.latLngBounds([lat, lng], [order.lat, order.lng]);
        map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1 });

        // Fetch route + ETA (throttled)
        clearTimeout(etaTimeout.current);
        etaTimeout.current = setTimeout(() => {
          fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${order.lng},${order.lat}?overview=full&geometries=geojson`)
            .then(r => r.json())
            .then(data => {
              if (data.routes?.[0]) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                if (routeLineRef.current) routeLineRef.current.remove();
                routeLineRef.current = L.polyline(coords, { color: "#3B82F6", weight: 5, opacity: 0.9 }).addTo(map);
                setEta(Math.round(route.duration / 60));
                setDistance((route.distance / 1000).toFixed(1));
              }
            })
            .catch(() => {});
        }, 2000);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      clearTimeout(etaTimeout.current);
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      driverMarkerRef.current = null;
      routeLineRef.current = null;
    };
  }, [order.id]);

  const handleDelivered = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    supabase.from("orders").update({ driver_lat: null, driver_lng: null }).eq("id", order.id).then();
    onDelivered();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: COLORS.bg, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.text, cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Navigation size={16} color="#3B82F6" /> Delivering {order.orderNumber}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{order.userName}</p>
        </div>
        {driverPos && <div style={{ background: "#3B82F622", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#3B82F6", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", animation: "pulse 2s infinite" }} /> LIVE
        </div>}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1 }} />

      {/* Bottom card */}
      <div style={{
        padding: "16px 20px", background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>ETA</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: COLORS.text }}>{eta ?? "—"} <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textSecondary }}>min</span></p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Distance</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: COLORS.text }}>{distance ?? "—"} <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textSecondary }}>km</span></p>
          </div>
        </div>

        <div style={{ fontSize: 13, color: COLORS.textSecondary, display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16, padding: "10px 12px", background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
          <MapPin size={14} color={COLORS.success} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ lineHeight: 1.4 }}>{order.deliveryAddress}</span>
        </div>

        <Button fullWidth size="lg" style={{ background: COLORS.success, color: COLORS.white }} onClick={handleDelivered}>
          <CircleCheck size={18} /> Mark as Delivered
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// KITCHEN DASHBOARD
// ============================================================
function KitchenDashboard({ orders, setOrders, menu, setMenu, storeOpen, setStoreOpen, onLogout }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("orders");

  const toggleStoreOpen = async () => {
    const newVal = !storeOpen;
    setStoreOpen(newVal);
    await supabase.from("store_settings").update({ is_open: newVal }).eq("id", 1);
  };
  const [navOrderId, setNavOrderId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("momoghar_sound") !== "false");
  const [dashProfileMapOpen, setDashProfileMapOpen] = useState(false);
  const prevOrderCountRef = useRef(orders.length);
  const prevStatusesRef = useRef({});

  // Owner profile from localStorage
  const [ownerProfile, setOwnerProfile] = useState(() => {
    const saved = localStorage.getItem("momoghar_owner");
    return saved ? JSON.parse(saved) : { avatar: null, kitchenAddress: "", kitchenLat: 43.6532, kitchenLng: -79.3832 };
  });

  const saveOwnerProfile = (updates) => {
    const updated = { ...ownerProfile, ...updates };
    setOwnerProfile(updated);
    localStorage.setItem("momoghar_owner", JSON.stringify(updated));
  };

  // Sound effect using Web Audio API
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.3;
      if (type === "new") {
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        // Second beep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
        osc2.start(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.65);
      } else {
        osc.frequency.value = 660;
        osc.type = "triangle";
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  }, [soundEnabled]);

  // Detect new orders and status changes for sound
  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === "pending").length;
    const prevPending = Object.values(prevStatusesRef.current).filter(s => s === "pending").length;
    if (pendingCount > prevPending && Object.keys(prevStatusesRef.current).length > 0) {
      playSound("new");
    }
    // Detect status changes
    orders.forEach(o => {
      if (prevStatusesRef.current[o.id] && prevStatusesRef.current[o.id] !== o.status) {
        playSound("status");
      }
    });
    const map = {};
    orders.forEach(o => { map[o.id] = o.status; });
    prevStatusesRef.current = map;
  }, [orders, playSound]);

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
            <span style={{ fontWeight: 700, fontSize: 16 }}>{order.orderNumber}</span>
            <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 10 }}>{order.userName}</span>
          </div>
          <Badge color={config.color} bg={config.bg}><config.Icon size={12} /> {config.label}</Badge>
        </div>

        {order.items.map((item, i) => (
          <div key={i} style={{ fontSize: 14, color: COLORS.textSecondary, padding: "3px 0" }}>
            <span style={{ fontWeight: 600, color: COLORS.text }}>{item.qty}×</span> {item.name}
          </div>
        ))}

        {order.specialInstructions && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: COLORS.warningDim, borderRadius: 8, fontSize: 12, color: COLORS.warning, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageSquare size={12} /> {order.specialInstructions}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.border}`, gap: 8 }}>
          <div>
            <span style={{ fontWeight: 700, color: COLORS.accent, fontSize: 16 }}>${order.total.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>{order.paymentMethod === "cash" ? <><Banknote size={11} /> Cash</> : <><CreditCard size={11} /> Paid</>}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {order.status === "pending" && (
              <Button variant="danger" size="sm" onClick={() => updateOrderStatus(order.id, "cancelled")}>Reject</Button>
            )}
            {nextStatus && nextStatus !== "delivered" && nextStatus !== "delivering" && (
              <Button size="sm" onClick={() => updateOrderStatus(order.id, nextStatus)}>
                <nextConfig.Icon size={14} /> {nextStatus === "accepted" ? "Accept" : nextStatus === "cooking" ? "Start Cooking" : nextStatus === "ready" ? "Mark Ready" : nextStatus}
              </Button>
            )}
            {nextStatus === "delivering" && (
              <Button size="sm" onClick={() => { updateOrderStatus(order.id, "delivering"); setNavOrderId(order.id); }}>
                <Truck size={14} /> Out for Delivery
              </Button>
            )}
            {order.status === "delivering" && (
              <>
                <Button size="sm" style={{ background: "#3B82F6", color: COLORS.white }} onClick={() => setNavOrderId(order.id)}><Navigation size={14} /> Navigate</Button>
                <Button variant="success" size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}><CircleCheck size={14} /> Delivered</Button>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={11} /> {order.deliveryAddress} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  const navOrder = orders.find(o => o.id === navOrderId);

  const dashNavTabs = [
    { id: "orders", label: "Orders", Icon: Inbox, badge: pendingOrders.length },
    { id: "menu", label: "Menu", Icon: UtensilsCrossed, badge: 0 },
    { id: "analytics", label: "Analytics", Icon: BarChart3, badge: 0 },
    { id: "settings", label: "Settings", Icon: Settings, badge: 0 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, paddingBottom: NAV_HEIGHT + 16 }}>
      {navOrder && (
        <DriverNavMap
          order={navOrder}
          onDelivered={() => { updateOrderStatus(navOrder.id, "delivered"); setNavOrderId(null); }}
          onClose={() => setNavOrderId(null)}
        />
      )}
      {/* Dashboard Header */}
      <div style={{ padding: isMobile ? "12px 16px" : "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><UtensilsCrossed size={isMobile ? 16 : 20} color={COLORS.accent} strokeWidth={2} /> Kitchen</h1>
          <div onClick={() => toggleStoreOpen()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20, background: storeOpen ? COLORS.successDim : COLORS.dangerDim, border: `1px solid ${storeOpen ? COLORS.success : COLORS.danger}44`, cursor: "pointer" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: storeOpen ? COLORS.success : COLORS.danger }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: storeOpen ? COLORS.success : COLORS.danger }}>{storeOpen ? "Open" : "Closed"}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setSoundEnabled(!soundEnabled); localStorage.setItem("momoghar_sound", !soundEnabled); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            {soundEnabled ? <Volume2 size={18} color={COLORS.textSecondary} /> : <VolumeX size={18} color={COLORS.textMuted} />}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: isMobile ? 16 : 24 }}>
        {tab === "orders" && (
          <>
            {/* Stats Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Pending", value: pendingOrders.length, color: COLORS.warning, Icon: Clock },
                { label: "Active", value: activeOrders.length, color: COLORS.accent, Icon: Flame },
                { label: "Delivering", value: deliveringOrders.length, color: COLORS.success, Icon: Truck },
                { label: "Sales", value: `$${totalSales.toFixed(0)}`, color: COLORS.success, Icon: DollarSign },
              ].map((stat, i) => (
                <div key={i} style={{ background: COLORS.card, borderRadius: 12, padding: 12, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{stat.label}</span>
                    <stat.Icon size={14} color={stat.color} />
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(360px, 1fr))", gap: isMobile ? 16 : 24 }}>
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLORS.warning, display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={14} /> New Orders <span style={{ background: COLORS.warningDim, borderRadius: 10, padding: "2px 10px", fontSize: 12 }}>{pendingOrders.length}</span>
                </h3>
                {pendingOrders.length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", padding: 40 }}>No pending orders</p>}
                {pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLORS.accent, display: "flex", alignItems: "center", gap: 8 }}>
                  <Flame size={14} /> In Progress <span style={{ background: COLORS.accentDim, borderRadius: 10, padding: "2px 10px", fontSize: 12 }}>{activeOrders.length + deliveringOrders.length}</span>
                </h3>
                {[...activeOrders, ...deliveringOrders].length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", padding: 40 }}>No active orders</p>}
                {[...activeOrders, ...deliveringOrders].map(o => <OrderCard key={o.id} order={o} />)}
              </div>
            </div>
          </>
        )}

        {tab === "menu" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Menu Items</h3>
            </div>
            {menu.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MenuItemIcon category={item.category} size={18} color={COLORS.accent} /></div>
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Total Revenue</p>
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
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>Delivering</p>
                <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, color: COLORS.success }}>{deliveringOrders.length}</p>
              </div>
            </div>
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
              <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Orders by Hour</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                {[2, 5, 3, 8, 12, 10, 7, 4, 6, 9, 11, 3].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: v * 10, background: `linear-gradient(180deg, ${COLORS.textSecondary}, ${COLORS.textMuted})`, borderRadius: "4px 4px 0 0", transition: "height 0.5s" }} />
                    <span style={{ fontSize: 9, color: COLORS.textMuted }}>{10 + i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            {/* Owner Profile */}
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 12px", cursor: "pointer" }} onClick={() => document.getElementById("owner-avatar-input").click()}>
                {ownerProfile.avatar ? (
                  <img src={ownerProfile.avatar} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={36} color={COLORS.accent} /></div>
                )}
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${COLORS.bg}` }}>
                  <Camera size={12} color={COLORS.bg} />
                </div>
                <input id="owner-avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement("canvas");
                      const size = 200;
                      canvas.width = size; canvas.height = size;
                      const ctx = canvas.getContext("2d");
                      const min = Math.min(img.width, img.height);
                      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
                      saveOwnerProfile({ avatar: canvas.toDataURL("image/jpeg", 0.7) });
                    };
                    img.src = reader.result;
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Kitchen Owner</h3>
            </div>

            {/* Kitchen Location */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><MapPin size={13} /> Kitchen Location</p>
              <div
                onClick={() => setDashProfileMapOpen(true)}
                style={{ padding: 14, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              >
                <MapPin size={18} color={ownerProfile.kitchenAddress ? COLORS.accent : COLORS.textMuted} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, color: ownerProfile.kitchenAddress ? COLORS.text : COLORS.textMuted, lineHeight: 1.4 }}>
                  {ownerProfile.kitchenAddress || "Tap to set your kitchen location"}
                </span>
                <ChevronRight size={16} color={COLORS.textMuted} />
              </div>
            </div>

            <FullScreenMap
              open={dashProfileMapOpen}
              onClose={() => setDashProfileMapOpen(false)}
              initialLat={ownerProfile.kitchenLat}
              initialLng={ownerProfile.kitchenLng}
              onConfirm={(addr, lat, lng) => saveOwnerProfile({ kitchenAddress: addr, kitchenLat: lat, kitchenLng: lng })}
            />

            {/* Sound Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Bell size={20} color={COLORS.textSecondary} />
                <div>
                  <p style={{ margin: 0, fontSize: 14 }}>Order Sounds</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.textMuted }}>Play sound on new orders & status changes</p>
                </div>
              </div>
              <div onClick={() => { setSoundEnabled(!soundEnabled); localStorage.setItem("momoghar_sound", String(!soundEnabled)); }}
                style={{ width: 48, height: 26, borderRadius: 13, background: soundEnabled ? COLORS.success : COLORS.border, cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.white, position: "absolute", top: 2, left: soundEnabled ? 24 : 2, transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </div>

            {/* Store Open/Close */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Home size={20} color={COLORS.textSecondary} />
                <div>
                  <p style={{ margin: 0, fontSize: 14 }}>Store Status</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: storeOpen ? COLORS.success : COLORS.danger }}>{storeOpen ? "Accepting orders" : "Store is closed"}</p>
                </div>
              </div>
              <div onClick={() => toggleStoreOpen()}
                style={{ width: 48, height: 26, borderRadius: 13, background: storeOpen ? COLORS.success : COLORS.border, cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.white, position: "absolute", top: 2, left: storeOpen ? 24 : 2, transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </div>

            {/* Logout */}
            <Button variant="danger" fullWidth style={{ marginTop: 24 }} onClick={onLogout}>Log Out</Button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: NAV_HEIGHT,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        paddingBottom: "env(safe-area-inset-bottom, 0px)", zIndex: 50,
      }}>
        {dashNavTabs.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 16px",
              color: isActive ? COLORS.accent : COLORS.textMuted, fontFamily: "inherit", position: "relative",
            }}>
              <div style={{ position: "relative" }}>
                <t.Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                {t.badge > 0 && (
                  <span style={{
                    position: "absolute", top: -6, right: -10,
                    background: COLORS.danger, color: COLORS.white,
                    fontSize: 10, fontWeight: 700, borderRadius: 10,
                    minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                  }}>{t.badge}</span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
            </button>
          );
        })}
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
    driverLat: row.driver_lat ? Number(row.driver_lat) : null,
    driverLng: row.driver_lng ? Number(row.driver_lng) : null,
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
  const [user, setUser] = useState(null);
  const [isDashboard, setIsDashboard] = useState(window.location.hash === "#dashboard");
  const [dashboardAuthed, setDashboardAuthed] = useState(() => sessionStorage.getItem("dashboard_auth") === "true");
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [storeOpen, setStoreOpen] = useState(true);

  // Listen for hash changes
  useEffect(() => {
    const handler = () => setIsDashboard(window.location.hash === "#dashboard");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Restore user from localStorage, then sync latest from Supabase
  useEffect(() => {
    if (isDashboard) return;
    const saved = localStorage.getItem("momoghar_user");
    if (saved) {
      const local = JSON.parse(saved);
      setUser(local);
      // Fetch latest from Supabase to sync cross-device changes
      supabase.from("users").select("*").eq("phone", local.phone).single().then(({ data, error }) => {
        if (error) console.error("User sync fetch error:", error);
        if (data) {
          const synced = { ...local, id: data.id, name: data.name, phone: data.phone, points: data.points || local.points || 0, avatar: data.avatar || local.avatar || null, address: data.address || local.address || "", addressLat: data.address_lat || local.addressLat || null, addressLng: data.address_lng || local.addressLng || null };
          localStorage.setItem("momoghar_user", JSON.stringify(synced));
          setUser(synced);
        }
      });
    }
  }, [isDashboard]);

  // Load store status + poll
  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from("store_settings").select("is_open").eq("id", 1).single();
      if (data) setStoreOpen(data.is_open);
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load menu from DB
  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from("menu_items").select("*").order("created_at");
      if (data) setMenu(data.map(normalizeMenuItem));
    };
    fetchMenu();
  }, []);

  // Load orders from DB (for customer when user set, or for dashboard when authed)
  useEffect(() => {
    if (!isDashboard && !user) return;
    if (isDashboard && !dashboardAuthed) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (data) setOrders(data.map(normalizeOrder));
    };
    fetchOrders();
  }, [user, isDashboard, dashboardAuthed]);

  // Real-time subscription for orders + fallback polling
  useEffect(() => {
    if (!isDashboard && !user) return;
    if (isDashboard && !dashboardAuthed) return;

    const fetchAll = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (data) setOrders(data.map(normalizeOrder));
    };

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, async (payload) => {
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
        const n = payload.new;
        setOrders(prev => prev.map(o =>
          o.id === n.id ? { ...o, status: n.status, driverLat: n.driver_lat ? Number(n.driver_lat) : o.driverLat, driverLng: n.driver_lng ? Number(n.driver_lng) : o.driverLng } : o
        ));
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Realtime failed, polling will handle it
          console.warn("Realtime subscription error, falling back to polling");
        }
      });

    // Fallback: poll every 5 seconds to catch anything realtime misses
    const pollInterval = setInterval(fetchAll, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, isDashboard, dashboardAuthed]);

  // --- DASHBOARD MODE ---
  if (isDashboard) {
    if (!dashboardAuthed) {
      return <DashboardLogin onLogin={() => setDashboardAuthed(true)} />;
    }
    return (
      <KitchenDashboard
        orders={orders}
        setOrders={setOrders}
        menu={menu}
        setMenu={setMenu}
        storeOpen={storeOpen}
        setStoreOpen={setStoreOpen}
        onLogout={() => {
          sessionStorage.removeItem("dashboard_auth");
          setDashboardAuthed(false);
        }}
      />
    );
  }

  // --- CUSTOMER MODE ---
  if (!user) {
    return <AuthView onLogin={(userData) => setUser(userData)} />;
  }

  return <CustomerApp user={user} orders={orders} setOrders={setOrders} menu={menu} storeOpen={storeOpen} />;
}
