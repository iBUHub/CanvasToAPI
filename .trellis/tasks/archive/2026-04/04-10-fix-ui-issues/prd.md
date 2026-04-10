# Fix UI Issues: Remove User Info and Fix ElSelect Display

## Goal

Fix two frontend UI issues:

1. Remove hardcoded user information from sidebar footer
2. Fix Element Plus ElSelect component not displaying selected value when collapsed

## Requirements

### Task 1: Remove User Information

- Remove the entire `sidebar-footer` section from `SideNavBar.vue` (lines 31-40)
- Remove associated CSS styles (lines 158-205)
- Ensure sidebar layout remains intact after removal

### Task 2: Fix ElSelect Display

- Element Plus ElSelect components should display the currently selected value when not expanded
- Current issue: appears blank/empty in collapsed state
- Likely cause: CSS color conflict between Element Plus default styles and Material Design 3 custom theme
- Affected components:
  - Log Level (debugMode: false/true)
  - Streaming Mode (streamingMode: "fake"/"real")
  - Selection Strategy (selectionStrategy: "round"/"random")
  - Theme (theme: "auto"/"light"/"dark")
  - Language (currentLang: "zh"/"en")

## Acceptance Criteria

- [ ] Sidebar footer section is completely removed
- [ ] No visual regression in sidebar layout
- [ ] All ElSelect components show selected value when collapsed
- [ ] ElSelect text is clearly visible in both light and dark themes
- [ ] ElSelect placeholder behavior works correctly (if applicable)
- [ ] No console errors related to removed code
- [ ] Lint passes

## Technical Notes

### Files to Modify

1. `ui/app/components/SideNavBar.vue` - Remove user profile section
2. `ui/app/pages/StatusPage.vue` - May need CSS overrides for Element Plus
3. `ui/app/styles/variables.less` - May need Element Plus theme customization

### Element Plus Customization

- Consider adding global CSS to override Element Plus input text colors
- Ensure text color matches Material Design 3 `@on-surface` color
- Test in both light and dark themes
- Possible approaches:
  - Deep selector to override Element Plus internal styles
  - CSS custom properties for Element Plus theme
  - Inline style overrides (last resort)

### Code Quality

- Run `npm run lint:fix` after changes
- Test in browser (both light and dark themes)
- Verify all settings still function correctly
