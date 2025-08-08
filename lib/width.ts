// Tailwind width utilities for custom breakpoints
// These will be used as classnames like w-[320px], w-[640px], etc.
// You can import and use this array for generating select options or mapping values

export const WIDTH_BREAKPOINTS = [
  320, 640, 800, 1280, 1600, 1920, 2048, 3840,
] as const;

export type WidthBreakpoint = (typeof WIDTH_BREAKPOINTS)[number];
