/* Material Next: independent design language built on M3; not an official Google design.
   Theming engine: seed color + expressiveness dial → full M3 color roles (light + dark),
   six harmonized accent families for categories, spring motion and corner scale.
   A browser port of material-next/scripts/mn.mjs. Color via material-color-utilities (Apache-2.0). */

import {
    argbFromHex, hexFromArgb, Hct, MaterialDynamicColors as MDC,
    SchemeTonalSpot, SchemeVibrant, SchemeContent,
} from './vendor/material-color-utilities.js';

// Curated moods from the Material Next generator. Picking one sets the seed; the dial stays the user's.
export const MOODS = [
    { name: 'tide',     label: 'Tide',   seed: '#00639B' },
    { name: 'signal',   label: 'Signal', seed: '#0B57D0' },
    { name: 'aurora',   label: 'Aurora', seed: '#00897B' },
    { name: 'sage',     label: 'Sage',   seed: '#4F7A5A' },
    { name: 'moss',     label: 'Moss',   seed: '#5E6B2A' },
    { name: 'ember',    label: 'Ember',  seed: '#C2410C' },
    { name: 'pulse',    label: 'Pulse',  seed: '#D32F2F' },
    { name: 'bloom',    label: 'Rose',   seed: '#C2185B' },
    { name: 'graphite', label: 'Slate',  seed: '#44546A' },
    { name: 'plum',     label: 'Plum',   seed: '#7B2D6B' },
    { name: 'nocturne', label: 'Violet', seed: '#5B4BDB' },
    { name: 'citrus',   label: 'Citrus', seed: '#E8A400' },
];
export const DEFAULT_THEME = { seed: '#00639B', dial: 'expressive' };

// Dial: springs [dampingRatio, stiffness], corner multiplier, accent chroma
export const DIALS = {
    calm:       { corner: 0.75, chroma: 30, springs: { 'spatial-fast': [1, 1400],   'spatial-default': [1, 700],   'spatial-slow': [1, 300] } },
    standard:   { corner: 1,    chroma: 42, springs: { 'spatial-fast': [0.9, 1400], 'spatial-default': [0.9, 700], 'spatial-slow': [0.9, 300] } },
    expressive: { corner: 1.25, chroma: 56, springs: { 'spatial-fast': [0.6, 800],  'spatial-default': [0.8, 380], 'spatial-slow': [0.8, 200] } },
};
const EFFECTS = { 'effects-fast': [1, 3800], 'effects-default': [1, 1600], 'effects-slow': [1, 800] };

const ROLES = [
    'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
    'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
    'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
    'error', 'onError', 'errorContainer', 'onErrorContainer',
    'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
    'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
    'surfaceContainerHigh', 'surfaceContainerHighest',
    'inverseSurface', 'inverseOnSurface', 'inversePrimary',
    'outline', 'outlineVariant', 'shadow', 'scrim',
];

// calm: soft tonal; standard: seed-faithful; expressive: max chroma, except greens/cyans
// (HCT hue 120–220) which go neon under Vibrant and stay Content.
function variantFor(dial, hct) {
    if (dial === 'calm') return SchemeTonalSpot;
    if (dial === 'expressive' && (hct.hue < 120 || hct.hue > 220)) return SchemeVibrant;
    return SchemeContent;
}

export function normalizeSeed(seed) {
    const hex = String(seed || '').trim().replace(/^#?/, '#').toUpperCase();
    return /^#[0-9A-F]{6}$/.test(hex) ? hex : DEFAULT_THEME.seed;
}
const normalizeDial = (dial) => (DIALS[dial] ? dial : DEFAULT_THEME.dial);

export function scheme(seed, dial, dark) {
    const hct = Hct.fromInt(argbFromHex(normalizeSeed(seed)));
    const s = new (variantFor(dial, hct))(hct, dark, 0);
    return Object.fromEntries(ROLES.map(r => [r, hexFromArgb(MDC[r].getArgb(s)).toUpperCase()]));
}

// Accent families for categories: fixed clean HCT hues (blue, coral, green, teal, pink, sky)
// that skip the muddy yellow/olive and purple bands, each nudged up to 10° toward the seed
// the way M3 harmonizes custom colors. Same tone and chroma rules as the theme.
const ACCENT_HUES = [262, 38, 145, 192, 2, 228];
export const ACCENT_COUNT = ACCENT_HUES.length;

function harmonize(hue, toward) {
    const diff = ((toward - hue + 540) % 360) - 180;
    return (hue + Math.sign(diff) * Math.min(Math.abs(diff) * .5, 10) + 360) % 360;
}
export function accents(seed, dial, dark) {
    const seedHue = Hct.fromInt(argbFromHex(normalizeSeed(seed))).hue;
    const chroma = DIALS[normalizeDial(dial)].chroma;
    const tone = (h, c, t) => hexFromArgb(Hct.from(h, c, t).toInt()).toUpperCase();
    return ACCENT_HUES.map((anchor) => {
        const h = harmonize(anchor, seedHue);
        return dark
            ? { base: tone(h, chroma, 80), container: tone(h, chroma * .6, 30), onContainer: tone(h, chroma * .5, 90) }
            : { base: tone(h, chroma, 40), container: tone(h, chroma * .7, 90), onContainer: tone(h, chroma, 10) };
    });
}

// ---- Springs → CSS linear() ----
function springAt(z, k, t) {
    const w = Math.sqrt(k);
    if (z < 1) {
        const wd = w * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w * t) * (1 + w * t);
}
function springToCss(z, k, n = 32) {
    let last = 0;
    for (let t = 0; t < 5; t += 0.001) if (Math.abs(springAt(z, k, t) - 1) >= 0.001) last = t;
    const T = last + 0.001;
    const pts = Array.from({ length: n + 1 }, (_, i) => i === n ? 1 : +springAt(z, k, (T * i) / n).toFixed(3));
    return { duration: Math.round(T * 1000), easing: `linear(${pts.join(', ')})` };
}

// ---- CSS output ----
const kebab = s => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
const ANIMATED = ROLES.filter(r => r !== 'shadow' && r !== 'scrim');

function colorBlock(seed, dial, dark, ind) {
    const c = scheme(seed, dial, dark);
    const roles = ROLES.map(r => `${ind}--md-sys-color-${kebab(r)}: ${c[r]};`);
    const acc = accents(seed, dial, dark).map((a, i) =>
        `${ind}--ycp-accent-${i + 1}: ${a.base}; --ycp-accent-${i + 1}-container: ${a.container}; --ycp-on-accent-${i + 1}-container: ${a.onContainer};`);
    return [...roles, ...acc].join('\n');
}
function dialBlock(dial, ind) {
    const d = DIALS[dial];
    const springs = Object.entries({ ...d.springs, ...EFFECTS }).map(([n, [z, k]]) => {
        const { duration, easing } = springToCss(z, k);
        return `${ind}--mn-${n}: ${duration}ms ${easing};`;
    });
    return [`${ind}--mn-corner-scale: ${d.corner};`, ...springs].join('\n');
}

export function themeCss(theme = DEFAULT_THEME) {
    const seed = normalizeSeed(theme.seed), dial = normalizeDial(theme.dial);
    const light = scheme(seed, dial, false);
    const icon = actionIconColors({ seed, dial });
    return [
        `/* Material Next theme ${seed}, ${dial}. Generated by theme-engine.js. Not an official Google design. */`,
        // Registered so a theme change crossfades instead of snapping.
        ANIMATED.map(r => `@property --md-sys-color-${kebab(r)} { syntax: '<color>'; inherits: true; initial-value: ${light[r]}; }`).join('\n'),
        `:root {\n${colorBlock(seed, dial, false, '  ')}\n${dialBlock(dial, '  ')}\n  --ycp-icon-fill: ${icon.fill}; --ycp-icon-glyph: ${icon.glyph};\n  transition: ${ANIMATED.map(r => `--md-sys-color-${kebab(r)} var(--mn-effects-slow)`).join(', ')};\n}`,
        `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${colorBlock(seed, dial, true, '    ')}\n  }\n}`,
        `:root[data-theme="dark"] {\n${colorBlock(seed, dial, true, '  ')}\n}`,
        `@media (prefers-reduced-motion: reduce) {\n  :root { --mn-spatial-fast: 0ms linear; --mn-spatial-default: 0ms linear; --mn-spatial-slow: 0ms linear; }\n}`,
    ].join('\n\n') + '\n';
}

// App icon colors: the theme's primary hue and chroma at tone 60 with a white glyph.
// Mid tone keeps the white ⌘ legible and still stands out on light, dark and colored toolbars.
export function actionIconColors(theme = DEFAULT_THEME) {
    const primary = scheme(theme.seed, normalizeDial(theme.dial), false).primary;
    const { hue, chroma } = Hct.fromInt(argbFromHex(primary));
    return { fill: hexFromArgb(Hct.from(hue, chroma, 60).toInt()).toUpperCase(), glyph: '#FFFFFF' };
}

export const themeKey = (theme) => `${normalizeSeed(theme.seed)}|${normalizeDial(theme.dial)}`;
