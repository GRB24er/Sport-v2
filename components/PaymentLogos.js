// Inline-SVG payment method logos. No external image deps — everything
// scales crisp at any size and uses currentColor where appropriate.

export function BitcoinLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Bitcoin">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M21.5 14.2c.4-2.5-1.6-3.9-4.2-4.8l.8-3.3-2-.5-.8 3.2c-.5-.1-1.1-.2-1.6-.4l.8-3.3-2-.5-.8 3.3-1.3-.3-2.7-.7-.5 2.1s1.5.3 1.5.4c.8.2.9.7.9 1.1L7.4 19c-.1.2-.3.5-.7.4 0 0-1.5-.4-1.5-.4l-1 2.3 2.5.6 1.4.4-.8 3.3 2 .5.8-3.3c.6.2 1.1.3 1.6.4l-.8 3.3 2 .5.8-3.3c3.4.6 6 .4 7-2.7.9-2.5-.1-3.9-1.8-4.9 1.4-.3 2.4-1.1 2.6-2.9zm-4.6 6.4c-.6 2.5-4.7 1.2-6 .8l1.1-4.3c1.3.3 5.5 1 4.9 3.5zm.6-6.5c-.6 2.3-3.9 1.1-5 .8l1-3.9c1.1.3 4.6.8 4 3.1z"
        fill="#fff"
      />
    </svg>
  );
}

export function UsdtLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="USDT">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.9 17.4v-.1c-.1 0-.7.1-2 .1-1.1 0-1.8 0-2.1-.1v.1c-3.4-.2-5.9-.8-5.9-1.5s2.5-1.3 5.9-1.5v2.4c.2.1.9.1 2.1.1s2-.1 2-.1v-2.4c3.4.2 5.9.8 5.9 1.5s-2.5 1.3-5.9 1.5zM17.9 14.1V12h5V8.7H9.1V12h5v2.1c-4.1.2-7.2.9-7.2 1.9s3.1 1.8 7.2 1.9v6.8h3.8v-6.8c4.1-.2 7.1-.9 7.1-1.9s-3.1-1.8-7.1-1.9z"
        fill="#fff"
      />
    </svg>
  );
}

export function MtnMomoLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="MTN Mobile Money">
      <circle cx="16" cy="16" r="16" fill="#FFCB05" />
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="9.5"
        fill="#0033A0"
        letterSpacing="0.5"
      >
        MTN
      </text>
      <text
        x="16"
        y="27"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="4"
        fill="#0033A0"
        letterSpacing="0.3"
      >
        MoMo
      </text>
    </svg>
  );
}

export function CardLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Card">
      <rect x="2" y="6" width="28" height="20" rx="3" fill="#1A1F36" />
      <rect x="2" y="10" width="28" height="3" fill="#0B9635" />
      <rect x="5" y="18" width="6" height="4" rx="1" fill="#D4AF37" />
      <rect x="5" y="23" width="12" height="1.5" rx="0.5" fill="#fff" opacity=".5" />
    </svg>
  );
}

// Compact row of accepted-payment logos with labels — drop into a hero, footer, or signup
export function PaymentMethodsRow({ compact = false }) {
  const size = compact ? 22 : 28;
  const labelStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    padding: compact ? "4px 8px" : "6px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#999",
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <span style={labelStyle}><BitcoinLogo size={size} /> Bitcoin</span>
      <span style={labelStyle}><UsdtLogo size={size} /> USDT</span>
      <span style={labelStyle}><MtnMomoLogo size={size} /> MTN MoMo</span>
      <span style={labelStyle}><CardLogo size={size} /> Card</span>
    </div>
  );
}
