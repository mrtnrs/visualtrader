/**
 * Shared SVG icon components used across the canvas
 */

export function IconLock({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
                d="M5.2 7V5.7c0-1.8 1.2-3.2 2.8-3.2s2.8 1.4 2.8 3.2V7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <rect x="4.2" y="7" width="7.6" height="6.6" rx="1.8" fill="currentColor" fillOpacity="0.9" />
        </svg>
    )
}

export function IconUnlock({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
                d="M10.8 7V5.9c0-1.8-1.2-3.2-2.8-3.2-1.2 0-2.2 0.8-2.6 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <rect x="4.2" y="7" width="7.6" height="6.6" rx="1.8" fill="currentColor" fillOpacity="0.9" />
        </svg>
    )
}

export function IconTrash({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4.5 5.2V12.4c0 0.9 0.7 1.6 1.6 1.6h3.8c0.9 0 1.6-0.7 1.6-1.6V5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M3.8 5.2H12.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M6.2 5.2V4.1c0-0.7 0.6-1.3 1.3-1.3h1c0.7 0 1.3 0.6 1.3 1.3V5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M6.6 7.2V12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
            <path d="M9.4 7.2V12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
        </svg>
    )
}
