"use client";

/**
 * FloatingNav — glass-morphic top nav that collapses to a compact pill after
 * ~100px of scroll, with layout-animated icon-to-pill hover expansion.
 *
 * Peer dependencies: react >=18, framer-motion >=10, tailwindcss >=3.
 * Standalone file — not wired into any app shell. Drop it into a React
 * project with Tailwind configured and render <FloatingNav />.
 *
 * Usage:
 *   <FloatingNav
 *     logo={<YourMark />}
 *     logoHref="/"
 *     links={[{ label: "GitHub", href: "https://github.com/you", icon: <GitHubIcon /> }]}
 *   />
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const SPRING = { type: "spring", stiffness: 400, damping: 30, mass: 0.8 };

const NAV_SHADOW =
  "0 0.5px 3px rgba(0,0,0,.01), 0 1.7px 8px rgba(0,0,0,.02), " +
  "0 4.5px 22px rgba(0,0,0,.05), 0 14px 70px rgba(0,0,0,.15), " +
  "0 0 0 1px rgba(0,0,0,.05)"; // last layer is the 1px hairline ring

const BLUR_STEPS = [0.047, 0.094, 0.19, 0.375, 0.75, 1.5, 3, 6];

const COMPACT_AT = 100;

/* ---------------------------------- icons -------------------------------- */

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.94 8.4H3.6V21h3.34V8.4ZM5.27 3a1.94 1.94 0 1 0 0 3.88 1.94 1.94 0 0 0 0-3.88ZM21 21h-3.34v-6.06c0-1.45-.03-3.3-2.02-3.3-2.03 0-2.34 1.58-2.34 3.2V21H9.96V8.4h3.2v1.72h.05c.45-.85 1.55-1.75 3.2-1.75 3.42 0 4.6 2.25 4.6 5.17V21Z"
      />
    </svg>
  );
}

function DribbbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
      <path d="M4 9.5c3 1.4 10 1.6 15.5.4M4.7 16c2.5-3.2 8-6 14.6-5.4M9 3.3c2.6 3 4.6 8.7 4.4 17" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M14 2v5h5M8.5 12h7M8.5 15.5h7M8.5 8.5H11" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="4.5" width={19} height={15} rx={2.5} />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

function PlusIcon({ open, transition }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      animate={{ rotate: open ? 45 : 0 }}
      transition={transition}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </motion.svg>
  );
}

function DefaultMark() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
      <path d="M12 2c.6 4.4 1.4 7 3 8.6 1.6 1.6 4.2 2.4 8.6 3-4.4.6-7 1.4-8.6 3-1.6 1.6-2.4 4.2-3 8.6-.6-4.4-1.4-7-3-8.6C7.4 15 4.8 14.2.4 13.6c4.4-.6 7-1.4 8.6-3C10.6 9 11.4 6.4 12 2Z" />
    </svg>
  );
}

const DEFAULT_LINKS = [
  { label: "LinkedIn", href: "#", icon: <LinkedInIcon /> }, // TODO: real profile URLs
  { label: "Dribbble", href: "#", icon: <DribbbleIcon /> },
  { label: "Resume", href: "#", icon: <ResumeIcon /> },
  { label: "Mail", href: "mailto:you@example.com", icon: <MailIcon /> },
];

/* ------------------------------ blur edges -------------------------------- */

/** 8 stacked, individually-masked blur layers so the blur amount itself
 *  ramps smoothly toward the viewport edge — backdrop-filter has no native
 *  gradient, so the ramp is faked by fading each fixed-blur layer in/out
 *  over a different band, strongest layers confined closest to the edge. */
function ProgressiveBlur({ edge }) {
  const isTop = edge === "top";
  const direction = isTop ? "to bottom" : "to top";
  const n = BLUR_STEPS.length;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 z-40 h-32 ${isTop ? "top-0" : "bottom-0"}`}
    >
      {BLUR_STEPS.map((blur, i) => {
        const bandEnd = ((n - i) / n) * 100; // % of strip, 0 = edge, 100 = inner
        const featherStart = Math.max(bandEnd - 100 / n, 0);
        const mask = `linear-gradient(${direction}, black 0%, black ${featherStart}%, transparent ${bandEnd}%)`;
        return (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------ icon button -------------------------------- */

function NavIconButton({ link, isHovered, onHoverStart, onHoverEnd, transition, reducedMotion }) {
  const external = link.href.startsWith("http");

  return (
    <motion.a
      href={link.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={link.label}
      layout
      transition={transition}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      className="relative flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={{
        width: isHovered ? "auto" : 44,
        paddingLeft: isHovered ? 16 : 0,
        paddingRight: isHovered ? 16 : 0,
        backgroundColor: isHovered ? "#fff" : "transparent",
      }}
    >
      <motion.span
        layout="position"
        transition={transition}
        className="grid h-5 w-5 shrink-0 place-items-center"
        style={{ color: isHovered ? "#000" : "rgba(255,255,255,.6)" }}
      >
        {link.icon}
      </motion.span>

      <AnimatePresence initial={false}>
        {isHovered && (
          <motion.span
            key="label"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={transition}
            className="whitespace-nowrap text-xs font-medium text-black"
            aria-hidden="true"
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.a>
  );
}

/* ---------------------------------- nav ------------------------------------ */

export default function FloatingNav({ logo, logoHref = "#", links = DEFAULT_LINKS }) {
  const [scrolled, setScrolled] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [compactHover, setCompactHover] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > COMPACT_AT;
        setScrolled((prev) => (prev === next ? prev : next));
        if (!next) setPinnedOpen(false);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCompact = scrolled && !pinnedOpen && !compactHover;
  const transition = prefersReducedMotion ? { duration: 0.15, ease: "easeOut" } : SPRING;

  useEffect(() => {
    if (isCompact) setHoveredIndex(null);
  }, [isCompact]);

  return (
    <>
      <ProgressiveBlur edge="top" />

      <motion.nav
        layout
        transition={transition}
        onMouseEnter={() => scrolled && setCompactHover(true)}
        onMouseLeave={() => setCompactHover(false)}
        aria-label="Primary"
        className={`fixed left-1/2 top-6 z-50 flex h-16 shrink-0 -translate-x-1/2 items-center gap-3 rounded-[40px] p-2 backdrop-blur-lg ${
          isCompact ? "w-[120px] bg-white/95" : "w-auto bg-black/0"
        }`}
        style={{ boxShadow: NAV_SHADOW }}
      >
        <motion.a
          layout
          href={logoHref}
          aria-label="Home"
          transition={transition}
          className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{
            backgroundColor: isCompact ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)",
            color: isCompact ? "#000" : "#fff",
          }}
        >
          {logo ?? <DefaultMark />}
        </motion.a>

        {isCompact ? (
          <motion.button
            layout
            type="button"
            transition={transition}
            onClick={() => setPinnedOpen(true)}
            aria-label="Open navigation"
            aria-expanded={false}
            className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full bg-black text-white outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2"
          >
            <PlusIcon open={false} transition={transition} />
          </motion.button>
        ) : (
          <motion.div layout transition={transition} className="flex items-center gap-1">
            {links.map((link, i) => (
              <NavIconButton
                key={link.label}
                link={link}
                isHovered={hoveredIndex === i}
                transition={transition}
                reducedMotion={prefersReducedMotion}
                onHoverStart={() => setHoveredIndex(i)}
                onHoverEnd={() => setHoveredIndex((h) => (h === i ? null : h))}
              />
            ))}

            {scrolled && (
              <motion.button
                layout
                type="button"
                transition={transition}
                onClick={() => {
                  setPinnedOpen(false);
                  setCompactHover(false);
                }}
                aria-label="Close navigation"
                aria-expanded={true}
                className="ml-1 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-black text-white outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2"
              >
                <PlusIcon open transition={transition} />
              </motion.button>
            )}
          </motion.div>
        )}
      </motion.nav>

      <ProgressiveBlur edge="bottom" />
    </>
  );
}
