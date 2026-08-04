export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo" aria-label="ResultBoard">
      <span className="logo-mark" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="2"
            width="9"
            height="9"
            rx="2"
            fill="white"
            opacity="0.9"
          />
          <rect
            x="13"
            y="2"
            width="9"
            height="9"
            rx="2"
            fill="white"
            opacity="0.6"
          />
          <rect
            x="2"
            y="13"
            width="9"
            height="9"
            rx="2"
            fill="white"
            opacity="0.6"
          />
          <rect
            x="13"
            y="13"
            width="9"
            height="9"
            rx="2"
            fill="white"
            opacity="0.4"
          />
        </svg>
      </span>
      {compact ? null : <strong>ResultBoard</strong>}
    </div>
  );
}
