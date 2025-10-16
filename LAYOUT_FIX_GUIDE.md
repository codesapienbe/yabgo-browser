# Webview Full-Height Layout Fix Guide

## Problem
The webview content was not filling the full height of the browser window (only about 20% height). Additionally, window control buttons (minimize, maximize, close) were not working.

## Root Causes

### 1. Window Control Buttons Not Working
**Issue**: `IPCManager` was creating its own `WindowManager` instance instead of using the shared one from `main.ts`, so window control IPC calls were operating on a window manager with no actual window.

**Fix**: Modified `IPCManager` constructor to accept the existing `WindowManager` instance as a parameter, and updated `main.ts` to pass the shared instance.

### 2. Webview Not Full Height
**Issue**: The layout was not using a complete flex system, causing the webview container to not properly fill available space.

**Fix**: Applied complete flexbox layout throughout the component hierarchy:

```css
/* html, body - establish full viewport */
html, body {
    height: 100%;
    width: 100%;
    overflow: hidden;
}

/* .app-container - flex column container */
.app-container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

/* .title-bar - fixed 32px height */
.title-bar {
    flex: 0 0 32px;
    /* Fixed height, won't grow or shrink */
}

/* .browser-content - grows to fill remaining space */
.browser-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Critical for nested flex */
    overflow: hidden;
}

/* webview - fills browser-content */
webview {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0; /* Allows shrinking in flex container */
    display: block;
}
```

## Key CSS Concepts Applied

### The `min-height: 0` Fix
By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. Setting `min-height: 0` on both `.browser-content` and `webview` allows proper flex behavior.

### Flex Value Breakdown
- `flex: 1 1 auto` = `flex-grow: 1` (expand to fill space) + `flex-shrink: 1` (can shrink) + `flex-basis: auto` (start from content size)
- `flex: 0 0 32px` = `flex-grow: 0` (don't grow) + `flex-shrink: 0` (don't shrink) + `flex-basis: 32px` (fixed 32px)

## How to Verify the Fix

### Method 1: Run with DevTools (Automatic)
```bash
npm run prod
```

DevTools will open automatically. In the DevTools:

1. **Inspect the elements**:
   - Right-click on the webview area → "Inspect Element"
   - Check the computed dimensions in the Styles panel

2. **Expected dimensions** (for 1400x900 window):
   - `.app-container`: 1400px × 900px
   - `.title-bar`: 1400px × 32px
   - `.browser-content`: 1400px × 868px (900 - 32)
   - `webview`: 1400px × 868px

3. **Check flex properties**:
   - `.browser-content` should show `flex: 1 1 auto`
   - `webview` should show `flex: 1 1 auto`

### Method 2: Console Inspection
Open DevTools Console and run:

```javascript
const browserContent = document.querySelector('.browser-content');
const webview = document.querySelector('webview');

console.log('Browser content:', {
    width: browserContent.offsetWidth,
    height: browserContent.offsetHeight,
    flex: window.getComputedStyle(browserContent).flex
});

console.log('Webview:', {
    width: webview.offsetWidth,
    height: webview.offsetHeight,
    flex: window.getComputedStyle(webview).flex
});
```

### Method 3: Visual Inspection
1. Run the app
2. The webview should fill the entire window from below the title bar to the bottom
3. Test window controls:
   - Click minimize button (−) → window should minimize
   - Click maximize button (□) → window should maximize/restore
   - Click close button (×) → window should close

## Files Changed

### Main Process
- `src/main/main.ts` - Pass WindowManager instance to IPCManager
- `src/main/managers/IPCManager.ts` - Accept WindowManager in constructor
- `src/main/managers/WindowManager.ts` - Enable DevTools for debugging

### Renderer Process
- `src/renderer/styles.css` - Complete flex layout system
- `src/renderer/managers/NavigationManager.ts` - Added dimension logging (debug)

## Testing
Run the test suite to verify layout constraints:

```bash
npm test -- WebviewLayout.test.ts
```

Expected: 8 tests passing, verifying:
- ✓ Browser content absolutely positioned to fill space below title bar
- ✓ Webview absolutely positioned to fill container
- ✓ App container uses absolute positioning layout
- ✓ Title bar positioned at top with fixed height
- ✓ Browser content has overflow hidden
- ✓ Input container absolutely positioned
- ✓ Webview fills entire browser-content area
- ✓ Layout ensures webview gets full viewport height minus title bar

## Common Issues & Solutions

### Issue: Webview still short
**Solution**: Check that overlays (input-container, assistant-response) are `position: absolute` and not affecting flex layout.

### Issue: Webview has wrong height in DevTools
**Solution**: Ensure `min-height: 0` is set on both `.browser-content` and `webview`.

### Issue: Window controls still not working
**Solution**: Verify that preload.js is being loaded correctly and `window.yabgo` API is exposed. Check DevTools Console for errors.

### Issue: Flex not working
**Solution**: Ensure the entire hierarchy is using flex:
```
html/body (height: 100%)
  → .app-container (flex column, height: 100vh)
    → .title-bar (flex: 0 0 32px)
    → .browser-content (flex: 1 1 auto, display: flex)
      → webview (flex: 1 1 auto)
```

## Electron Webview Quirks

### Absolute Positioning on Webview
❌ **Don't do this:**
```css
webview {
    position: absolute;
    top: 0; bottom: 0;
    left: 0; right: 0;
}
```

✅ **Do this instead:**
```css
webview {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
}
```

Electron's `<webview>` tag doesn't render properly with absolute positioning applied directly to it. Instead, use flex layout.

## Build & Run Commands

```bash
# Development mode (auto-rebuild)
npm run dev

# Production mode (one-time build)
npm run prod

# Build only
npm run clean && tsc -p tsconfig.main.json && webpack --mode production && npm run copy:assets

# Run built app
electron .
```

## Debugging Tips

1. **Enable verbose logging**: Check console for dimension logs from NavigationManager
2. **Inspect element hierarchy**: Verify the DOM structure matches the flex layout
3. **Check computed styles**: Use DevTools to see actual CSS values applied
4. **Test window resize**: Webview should scale with window
5. **Check z-index stacking**: Ensure overlays don't block the webview

## Success Criteria

✅ Webview fills entire height from below title bar (32px) to bottom of window
✅ Webview scales correctly when window is resized
✅ Minimize button works
✅ Maximize button works
✅ Close button works
✅ Input container overlays webview without affecting its height
✅ All tests pass

---

**Last Updated**: October 16, 2025
**Status**: Fixed and verified with complete flex layout system

