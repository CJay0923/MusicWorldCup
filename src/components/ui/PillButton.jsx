import { clsx } from 'clsx';

/**
 * Shared pill-shaped toggle button.
 * Replaces .size-btn, .cross-battle-tab, .ranking-tab, .bracket-size-btn.
 *
 * @param {boolean} active - whether this option is selected
 * @param {React.ReactNode} children - button label
 * {() => void} onClick
 * @param {boolean} disabled
 * @param {'accent'|'accent2'|'side-left'|'side-right'} [color='accent'] - active color theme
 * @param {string} [className] - extra classes
 * @param {string} [type='button']
 */
export default function PillButton({
  active,
  children,
  onClick,
  disabled = false,
  color = 'accent',
  className,
  type = 'button',
}) {
  const colorMap = {
    accent: {
      active: 'border-accent bg-accent/15 text-ink',
      hover: 'hover:border-accent/30 hover:text-ink',
    },
    accent2: {
      active: 'border-accent2 bg-accent2/15 text-ink',
      hover: 'hover:border-accent2/30 hover:text-ink',
    },
    'side-left': {
      active: 'border-side-left bg-side-left/15 text-ink',
      hover: 'hover:border-side-left/30 hover:text-ink',
    },
    'side-right': {
      active: 'border-side-right bg-side-right/15 text-ink',
      hover: 'hover:border-side-right/30 hover:text-ink',
    },
  };
  const c = colorMap[color] || colorMap.accent;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={clsx(
        'cursor-pointer rounded-full border-[1.5px] border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-white/65 transition-all duration-200',
        'hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-ink',
        'active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-40',
        active && c.active,
        !active && c.hover,
        className,
      )}
    >
      {children}
    </button>
  );
}
