/**
 * Utility Helper Functions
 */

/**
 * Format time to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format number with decimal places
 * @param {number} num - Number to format
 * @param {number} places - Decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(num, places = 1) {
    return num.toFixed(places);
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Lerp (linear interpolation)
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor 0-1
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Convert hex color to RGB
 * @param {number} hex - Hex color value
 * @returns {object} RGB object with r, g, b
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
        '#' + hex.toString(16).padStart(6, '0')
    );
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
          }
        : { r: 0, g: 0, b: 0 };
}

/**
 * Get element by ID with error handling
 * @param {string} id - Element ID
 * @returns {Element|null} Element or null
 */
export function getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID "${id}" not found`);
    }
    return element;
}

/**
 * Create text canvas for Three.js textures
 * @param {string} text - Text to render
 * @param {object} options - Rendering options
 * @returns {HTMLCanvasElement} Canvas element
 */
export function createTextCanvas(text, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 256;
    canvas.height = options.height || 64;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = options.bgColor || '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = options.textColor || '#ff6b35';
    ctx.font = options.font || 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas;
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func(...args);
        }
    };
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timeoutId = null;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Add event listener with automatic cleanup
 * @param {Element} element - DOM element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function addEventListener(element, event, handler) {
    element?.addEventListener(event, handler);
    return () => element?.removeEventListener(event, handler);
}

const helpers = {
    formatTime,
    formatNumber,
    clamp,
    lerp,
    hexToRgb,
    getElementById,
    createTextCanvas,
    throttle,
    debounce,
    addEventListener
};

export default helpers;
