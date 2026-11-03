# Rotating Wheel Tab Navigation — Implementation Specification

> **Status note (2026-11):** the visual/behavioural §§ below (dark navy theme,
> click-to-confirm) were overridden by `PROMPTS.md` — the implementation is
> intentionally light-themed with auto-navigate on align + circle→wheel morph.
> The structural §§ (reduced-motion, keyboard/Escape/focus handling, testing
> checklist) still apply.

## 1. Objective

Replace the existing right-side sliding sidebar with a rotating circular navigation wheel matching the provided reference image.

The design must use:
- A dark navy/charcoal background.
- Circular navigation segments with thin blue-gray borders.
- A fixed green triangular pointer at the top.
- A green highlight on the tab aligned with the pointer.
- One circular green button in the center containing a white X.
- The existing navigation tabs, their icons, names, and destinations.

The interaction must follow:

**Open → Rotate → Align → Select**

The center green X closes the wheel and returns to the current screen. It must not close the application or sign the user out.

## 2. Visual Design Requirements

### Background
Use a very dark navy/charcoal background that matches the reference. If the wheel is displayed as an overlay, dim the underlying screen without making the wheel difficult to see.

### Wheel
- Use a circular wheel divided into evenly spaced segments.
- Use dark navy fills with subtle blue-gray borders.
- Separate segments with thin radial lines.
- Keep the wheel visually balanced and symmetrical.
- Avoid unnecessary decoration, extra buttons, extra icons, or additional panels.

### Fixed green pointer
- Place a small green triangle directly above the wheel.
- Point the triangle downward toward the wheel.
- Keep it fixed in place while the wheel rotates.
- The pointer identifies which tab is currently aligned.

### Aligned tab
When a tab aligns with the pointer:
- Highlight its segment with a thin green outline.
- Add a subtle green glow similar to the reference.
- Keep the icon and label clearly visible.
- Remove the highlight from the previously aligned tab.

Do not rely on color alone. The selected segment must also have a distinguishable outline or shape treatment.

### Center green button
- Place one circular green button at the exact center of the wheel.
- Use a simple white X icon.
- Keep the button visually prominent but smaller than the overall wheel.
- Clicking it closes the wheel and returns to the screen that was open before the wheel appeared.
- Do not add text or additional icons to this button.

### Tab icons and labels
- Reuse the existing application's navigation icons and labels.
- Use a consistent icon size and visual style.
- Keep all labels upright and readable.
- Do not rotate the actual icon artwork or text with the wheel.
- Do not invent new tabs based on the example image.

## 3. Menu Trigger

Place a simple menu icon in the top-right corner of the existing interface.

Behaviour:
1. Clicking the menu icon opens the wheel.
2. Clicking the menu icon again closes the wheel.
3. Opening the wheel aligns the current active tab with the fixed pointer.
4. The wheel appears smoothly without shifting the underlying page layout.
5. The existing right-side sliding sidebar must no longer be used for this navigation interaction.

The menu icon must have an accessible name such as "Open navigation menu".

## 4. Wheel Structure

Each navigation tab must retain:
- Its original identifier.
- Its original label.
- Its existing icon.
- Its destination or route.
- Its existing permission rules.

Arrange the tabs around a circular path, with equal angular spacing.

For N tabs:

`angleBetweenTabs = 360° / N`

Calculate each tab's position from its stable index and the wheel's current rotation angle.

The wheel rotates as a single unit. Its tabs maintain their relative positions while moving around the circle.

The pointer remains stationary.

If the application contains many tabs, adjust the wheel size or provide a sensible compact fallback. Do not allow labels to overlap or become unreadable.

## 5. Rotate and Align Interaction

### Step 1 — Open

The user clicks the top-right menu icon.

The wheel opens with the currently active application tab aligned with the fixed green pointer.

### Step 2 — Drag

The user presses or touches the wheel and drags around its center.

- Track the pointer's angular movement relative to the wheel's center.
- Convert that angular movement into wheel rotation.
- Update the wheel continuously during the drag.
- Make the wheel follow the user's movement without noticeable lag.
- Support mouse and touchscreen input.

Dragging must rotate the wheel, not move the entire wheel across the screen.

### Step 3 — Align

As the wheel rotates, determine which tab is nearest to the fixed pointer.

- Update the aligned tab as the wheel moves.
- Highlight the currently aligned segment.
- Remove the highlight from the previously aligned segment.
- Keep the green pointer fixed at the top.

When the user releases the wheel, smoothly snap it to the nearest tab alignment.

Avoid abrupt jumps when the rotation crosses 0° or 360°.

### Step 4 — Select

Dragging alone must not change the application route.

After the wheel snaps into alignment, the user clicks the highlighted tab to navigate to its existing destination.

Navigate only after the user explicitly confirms the selection.

This separation is important: rotating explores the tabs, while clicking selects a destination.

### Step 5 — Close

Clicking the center green X closes the wheel.

The user returns to the screen that was open before the wheel appeared. The application route remains unchanged.

The wheel may also close when the user presses Escape, clicks the menu trigger again, or clicks outside the wheel if the overlay design supports outside-click dismissal.

## 6. Rotation Mathematics

The implementation must calculate rotation and alignment reliably.

Represent the wheel's rotation as an angle in degrees.

For each tab:
- Store a stable logical index.
- Calculate its base angular position.
- Add the current wheel rotation to obtain its displayed position.
- Compare its displayed angle with the fixed pointer angle.
- Identify the tab with the smallest angular distance from the pointer.

Use circular angular distance so that positions near 0° and 360° are treated as neighbours.

For example, if the wheel has eight tabs:

`360° / 8 = 45°`

Each tab is separated by 45 degrees.

The snap operation should rotate the wheel to the nearest valid alignment angle without changing the logical identity or destination of any tab.

The exact angle sign and rotation direction depend on the chosen coordinate system. Establish one convention and use it consistently throughout the implementation.

## 7. Animation

Use smooth, restrained animations matching the reference image.

Suggested initial durations:
- Opening: 250–350 ms.
- Closing: 180–250 ms.
- Snap-to-tab: 200–350 ms.

During dragging, the wheel should directly follow the pointer rather than running an independent easing animation.

Use transform-based rotation where possible. Avoid unnecessary layout recalculation, jitter, flashing highlights, or sudden direction changes.

The aligned-tab highlight should transition smoothly.

Respect the operating system's reduced-motion preference by removing or shortening nonessential animations and glows.

## 8. State Management

Keep these states separate:

1. `isWheelOpen` — whether the wheel is visible.
2. `rotationAngle` — the wheel's current rotation.
3. `alignedTabId` — the tab nearest the fixed pointer.
4. `activeRoute` — the application's actual current destination.
5. Drag state — whether the user is currently rotating the wheel.

The exact names may follow the existing project's conventions.

Important rules:
- Rotating the wheel updates its angle and aligned-tab highlight only.
- Snapping changes the wheel's final angle and aligned tab only.
- Clicking a tab navigates to its existing destination.
- Clicking the center X only closes the wheel.
- Opening the wheel aligns it with the current active route.
- Closing the wheel does not modify the current route.

Do not create a second routing system or duplicate the existing navigation configuration.

## 9. Responsive Layout

The wheel must fit within the visible viewport.

- Calculate its size from the available screen width and height.
- Keep the center button large enough to click or touch comfortably.
- Keep the pointer aligned with the top of the wheel.
- Ensure labels do not extend beyond the wheel or overlap excessively.
- Support desktop browsers and smaller mobile screens.
- Test different browser zoom levels and window sizes.

If the number of tabs makes the wheel unsuitable for a small screen, provide a clear fallback rather than shrinking everything until it becomes unreadable.

## 10. Accessibility

- Give the menu trigger and center X accessible names.
- Make every navigation tab keyboard accessible.
- Support Tab, arrow-key navigation, Enter to select, and Escape to close.
- Manage keyboard focus correctly while the wheel is open.
- Return focus to the menu trigger after closing.
- Provide a visible focus indicator.
- Do not rely only on green color to indicate the aligned tab.
- Prevent accidental navigation when the user is dragging.
- Respect existing permissions and disabled or hidden navigation items.
- Prevent interaction with the background while the wheel is open if it behaves as a modal.

## 11. Implementation Plan

### Phase 1 — Inspect
Before editing, inspect:
- The existing sidebar and navigation components.
- Navigation tab definitions.
- Route configuration.
- Existing icons and design tokens.
- Permission checks.
- Current animation dependencies.
- Existing responsive and accessibility patterns.

Identify the smallest set of files that need changes.

### Phase 2 — Build the wheel
Implement the circular segments, fixed pointer, center X button, and menu trigger.

Use the existing navigation data rather than hardcoding a new set of tabs.

### Phase 3 — Implement rotation
Add mouse and touch dragging. Calculate angular movement relative to the wheel's center and rotate the wheel smoothly.

### Phase 4 — Implement alignment
Determine the tab nearest the pointer, update its highlight, and snap the wheel to the nearest tab when dragging ends.

### Phase 5 — Implement selection
Allow the user to click the aligned tab to navigate. Ensure dragging by itself does not change the route.

### Phase 6 — Polish and verify
Add opening and closing transitions, responsive behaviour, keyboard interaction, focus management, and reduced-motion support.

Do not redesign unrelated screens or modify unrelated application behaviour.

## 12. Testing Checklist

### Opening and closing
- [ ] The top-right menu icon opens the wheel.
- [ ] The wheel opens with the active tab aligned.
- [ ] The center green X closes the wheel.
- [ ] Closing preserves the current route.
- [ ] Escape and the menu trigger close the wheel correctly.

### Rotation and alignment
- [ ] Mouse dragging rotates the wheel.
- [ ] Touch dragging rotates the wheel.
- [ ] The wheel follows the pointer without noticeable lag.
- [ ] The pointer never rotates or moves with the wheel.
- [ ] The aligned tab highlight updates continuously.
- [ ] Releasing the wheel snaps the nearest tab to the pointer.
- [ ] Rotation remains stable across the 0°/360° boundary.

### Selection and navigation
- [ ] Dragging does not navigate.
- [ ] Clicking the aligned tab opens the correct destination.
- [ ] Every existing tab remains available and functional.
- [ ] Permissions and hidden tabs behave as before.
- [ ] The active tab is aligned correctly when reopening the wheel.

### Visual quality
- [ ] The wheel uses the reference's dark navy/charcoal and green palette.
- [ ] The pointer is a fixed green triangle at the top.
- [ ] The center button is green with a simple white X.
- [ ] Segment borders are subtle and readable.
- [ ] Icons and labels remain upright.
- [ ] No unnecessary icons, panels, or decorative controls are added.
- [ ] No visible jitter, layout shifts, or overlapping labels occur.

### Accessibility and responsiveness
- [ ] Keyboard interaction works.
- [ ] Focus is managed correctly.
- [ ] Touch targets are usable.
- [ ] The wheel fits on small screens.
- [ ] Reduced-motion settings are respected.

## 13. Final Instruction to the Coding Agent

Implement the rotating wheel as a replacement for the existing right-side sidebar navigation, matching the supplied reference image.

Prioritize the fixed green pointer, dark segmented wheel, green aligned-tab highlight, and central green X close button.

The core behaviour must be:

**Open the wheel → drag to rotate → align a tab with the fixed pointer → release to snap → click the aligned tab to navigate.**

The central green X must close the wheel without changing the current screen.

Reuse the application's existing tabs, routes, permissions, and design conventions. Do not add unnecessary icons, features, decorative elements, or unrelated changes.

After implementation, run the project's relevant checks and report which files were changed, how the rotation and alignment work, and which tests were completed.
