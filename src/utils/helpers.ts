/**
 * Utility Functions
 */

/**
 * Format time to MM:SS format
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'Continuous';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format number with decimal places
 */
export function formatNumber(num: number, places: number = 1): string {
  return num.toFixed(places);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  const hexStr = '#' + hex.toString(16).padStart(6, '0');
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexStr);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  let lastCall = 0;
  return ((...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func(...args);
    }
  }) as T;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

/**
 * Get status color based on efficiency
 */
export function getStatusColor(efficiency: number): number {
  if (efficiency >= 95) return 0x4ade80;
  if (efficiency >= 85) return 0xfbbf24;
  if (efficiency >= 70) return 0xf97316;
  return 0xa855f7;
}

/**
 * Get status label based on efficiency
 */
export function getStatusLabel(efficiency: number): string {
  if (efficiency >= 95) return '✓ OPTIMAL';
  if (efficiency >= 85) return '⚠ CAUTION';
  if (efficiency >= 70) return '✕ WARNING';
  return '✕ CRITICAL';
}

/**
 * Calculate average of numbers
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}
