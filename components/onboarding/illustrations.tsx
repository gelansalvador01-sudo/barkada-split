/**
 * Monochromatic lavender 3D-styled illustrations for the onboarding flow.
 * Pure SVG in the reference palette (#BD93F9 / #C3B1E1) floating over an
 * isometric grid — no external assets.
 */

/** Shared isometric base grid + sparkles, used beneath both hero compositions. */
function IsoBase({ id }: { id: string }) {
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BD93F9" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#BD93F9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* perspective grid diamonds */}
      <g stroke="#BD93F9" strokeOpacity="0.16" strokeWidth="1" fill="none">
        <path d="M160 232 24 296M160 232 296 296M160 232 84 302M160 232 236 302" />
        <path d="M160 232 64 266M160 232 256 266M160 232 116 282M160 232 204 282" />
        <path d="M32 300c40-18 86-28 128-28s88 10 128 28" />
        <path d="M60 278c32-14 68-22 100-22s68 8 100 22" />
      </g>
      <ellipse cx="160" cy="240" rx="120" ry="30" fill={`url(#${id}-fade)`} />
      {/* sparkles */}
      <g fill="#C3B1E1">
        <path d="M52 96l2.4 6.4L61 105l-6.6 2.4L52 114l-2.4-6.6L43 105l6.6-2.6L52 96Z" opacity="0.85" />
        <path d="M272 60l1.8 4.8 4.8 1.8-4.8 1.8L272 73l-1.8-4.6-4.8-1.8 4.8-1.8L272 60Z" opacity="0.7" />
        <path d="M250 150l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4 1.4-3.6Z" opacity="0.55" />
        <circle cx="74" cy="52" r="1.6" opacity="0.6" />
        <circle cx="288" cy="120" r="1.3" opacity="0.5" />
        <circle cx="34" cy="160" r="1.2" opacity="0.45" />
      </g>
    </g>
  );
}

/**
 * Screen 1 hero: a stylized hand reaching up to support a wireframe globe
 * node, a hovering Bitcoin token, stars, over the isometric base grid.
 */
export function HandGlobeHero() {
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label="Hand supporting a digital globe with a floating Bitcoin token">
      <defs>
        <linearGradient id="hg-globe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C3B1E1" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="hg-hand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C3B1E1" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#5A2EE6" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="hg-btc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BD93F9" />
          <stop offset="100%" stopColor="#5A2EE6" />
        </linearGradient>
        <radialGradient id="hg-glow" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="160" cy="140" r="120" fill="url(#hg-glow)" />
      <IsoBase id="hg" />

      {/* wireframe globe */}
      <g className="animate-bs-float" style={{ animationDuration: "5.5s" }}>
        <circle cx="160" cy="118" r="46" fill="rgba(124,58,237,0.12)" stroke="url(#hg-globe)" strokeWidth="2" />
        <ellipse cx="160" cy="118" rx="46" ry="18" fill="none" stroke="#BD93F9" strokeOpacity="0.65" strokeWidth="1.4" />
        <ellipse cx="160" cy="118" rx="18" ry="46" fill="none" stroke="#BD93F9" strokeOpacity="0.65" strokeWidth="1.4" />
        <ellipse cx="160" cy="118" rx="34" ry="46" fill="none" stroke="#BD93F9" strokeOpacity="0.35" strokeWidth="1" />
        <ellipse cx="160" cy="118" rx="46" ry="34" fill="none" stroke="#BD93F9" strokeOpacity="0.35" strokeWidth="1" />
        <line x1="114" y1="118" x2="206" y2="118" stroke="#BD93F9" strokeOpacity="0.4" strokeWidth="1" />
        {/* globe nodes */}
        <circle cx="160" cy="72" r="3.2" fill="#C3B1E1" />
        <circle cx="114" cy="118" r="2.6" fill="#C3B1E1" opacity="0.9" />
        <circle cx="206" cy="118" r="2.6" fill="#C3B1E1" opacity="0.9" />
        <circle cx="160" cy="164" r="3.2" fill="#C3B1E1" />
      </g>

      {/* orbit ring around globe */}
      <ellipse cx="160" cy="126" rx="86" ry="24" fill="none" stroke="#C3B1E1" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="4 7" />

      {/* hovering Bitcoin token */}
      <g className="animate-bs-float" style={{ animationDuration: "4.2s", animationDelay: "0.6s" }}>
        <circle cx="248" cy="88" r="24" fill="url(#hg-btc)" />
        <circle cx="248" cy="88" r="24" fill="none" stroke="#C3B1E1" strokeOpacity="0.7" strokeWidth="1.4" />
        <circle cx="248" cy="88" r="19" fill="none" stroke="#C3B1E1" strokeOpacity="0.45" strokeWidth="1" />
        <text x="248" y="97" textAnchor="middle" fontSize="24" fontWeight="700" fill="#05040B" fontFamily="'Space Grotesk', sans-serif">₿</text>
      </g>

      {/* small satellite coin */}
      <g className="animate-bs-float" style={{ animationDuration: "6.4s", animationDelay: "1.1s" }}>
        <circle cx="72" cy="146" r="13" fill="rgba(195,177,225,0.16)" stroke="#C3B1E1" strokeOpacity="0.75" strokeWidth="1.4" />
        <text x="72" y="151" textAnchor="middle" fontSize="13" fontWeight="700" fill="#C3B1E1" fontFamily="'Space Grotesk', sans-serif">◈</text>
      </g>

      {/* reaching hand, palm up */}
      <g className="animate-bs-float" style={{ animationDuration: "6s", animationDelay: "0.3s" }}>
        <path
          d="M118 250c-8-2-14-8-13-16 1-7 7-10 13-9l30 5c4-8 12-13 21-12 3 0 5 3 4 6l-2 4c8-3 17-2 23 4 3 3 2 8-2 10l-8 4c8-2 16 0 21 6 3 4 1 9-4 10l-14 4c-22 6-46 1-69-16Z"
          fill="url(#hg-hand)"
          opacity="0.92"
        />
        <path
          d="M118 250c-8-2-14-8-13-16 1-7 7-10 13-9l30 5c4-8 12-13 21-12"
          fill="none" stroke="#C3B1E1" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round"
        />
        {/* wrist */}
        <path d="M118 250c-10 8-16 18-18 30h46c2-10 6-18 12-24" fill="url(#hg-hand)" opacity="0.85" />
      </g>

      {/* lift beam from palm to globe */}
      <path d="M150 236c-4-16-6-32-2-50" stroke="#BD93F9" strokeOpacity="0.4" strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Screen 2 hero: a floating isometric cube vault with integrated coin slots
 * and crypto currency nodes, hovering over the base grid.
 */
export function CubeVaultHero() {
  return (
    <svg viewBox="0 0 320 300" className="h-full w-full" role="img" aria-label="Floating cube vault with coin slots and currency nodes">
      <defs>
        <linearGradient id="cv-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C3B1E1" />
          <stop offset="100%" stopColor="#9A7BE8" />
        </linearGradient>
        <linearGradient id="cv-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="cv-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A2EE6" />
          <stop offset="100%" stopColor="#3B1480" />
        </linearGradient>
        <radialGradient id="cv-glow" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="160" cy="140" r="115" fill="url(#cv-glow)" />
      <IsoBase id="cv" />

      <g className="animate-bs-float" style={{ animationDuration: "5s" }}>
        {/* cube: top face */}
        <path d="M160 62 246 110 160 158 74 110Z" fill="url(#cv-top)" />
        {/* left face */}
        <path d="M74 110 160 158 160 244 74 196Z" fill="url(#cv-left)" />
        {/* right face */}
        <path d="M246 110 160 158 160 244 246 196Z" fill="url(#cv-right)" />
        {/* edge highlights */}
        <path d="M160 62 246 110 160 158 74 110Z" fill="none" stroke="#C3B1E1" strokeOpacity="0.8" strokeWidth="1.6" />
        <path d="M74 110 160 158 160 244M246 110 160 158" fill="none" stroke="#C3B1E1" strokeOpacity="0.55" strokeWidth="1.6" />

        {/* coin slots on top face */}
        <g transform="translate(160 108)">
          <rect x="-44" y="-7" width="34" height="14" rx="7" fill="#05040B" opacity="0.55" transform="skewY(26)" />
          <rect x="12" y="-7" width="34" height="14" rx="7" fill="#05040B" opacity="0.55" transform="skewY(-26) translate(34 0)" />
        </g>
        {/* node rings on the top face */}
        <g fill="none" stroke="#05040B" strokeOpacity="0.5" strokeWidth="1.4">
          <circle cx="160" cy="108" r="12" />
          <circle cx="160" cy="108" r="6.5" />
        </g>
        <circle cx="160" cy="108" r="3" fill="#05040B" opacity="0.7" />

        {/* front face detail: keypad node grid */}
        <g fill="#C3B1E1" opacity="0.85">
          <circle cx="128" cy="186" r="2.4" />
          <circle cx="144" cy="195" r="2.4" />
          <circle cx="160" cy="204" r="2.4" />
        </g>
        <path d="M104 172l24 13 32 17 32-17 24-13" fill="none" stroke="#C3B1E1" strokeOpacity="0.4" strokeWidth="1.2" />
      </g>

      {/* orbiting coin */}
      <g className="animate-bs-float" style={{ animationDuration: "4.6s", animationDelay: "0.8s" }}>
        <circle cx="66" cy="96" r="14" fill="rgba(195,177,225,0.14)" stroke="#C3B1E1" strokeOpacity="0.8" strokeWidth="1.5" />
        <text x="66" y="101" textAnchor="middle" fontSize="14" fontWeight="700" fill="#C3B1E1" fontFamily="'Space Grotesk', sans-serif">₿</text>
      </g>
      {/* tiny spark orbit */}
      <ellipse cx="160" cy="152" rx="108" ry="34" fill="none" stroke="#C3B1E1" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 8" />
    </svg>
  );
}
