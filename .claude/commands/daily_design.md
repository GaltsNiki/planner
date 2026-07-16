You will be implementing a design change to the Daily view in this codebase.

$ARGUMENTS

ALGORITHM:

1. Use the Playwright MCP to take screenshots of the current Daily view.
2. Pass these screenshots to the Claude Code to get advice on how to upgrade this view.
3. Use the advice from Claude Code to upgrade the view, applying the DESIGN PRINCIPLES below.

DESIGN PRINCIPLES (evaluate the current layout against each, and prioritize fixes accordingly):

1. Fitts's Law — primary/frequent actions should be large and placed near screen edges/corners (easier to reach, effectively infinite target size at the border).
2. Gestalt grouping:
   - Proximity: related elements sit close together; unrelated elements get extra spacing.
   - Similarity: elements with the same meaning/role share consistent color, shape, size.
   - Common region: use borders/backgrounds/dividers to visually bind a group.
3. Visual hierarchy / scan pattern:
   - F-pattern for text/list-heavy screens (reading top row, shorter second row, then vertical scan down the left).
   - Z-pattern for simpler screens (top-left → top-right → diagonal → bottom-left → bottom-right).
4. Window zoning: top = global actions/toolbar, left = navigation, center = primary content, right = contextual details/inspector, bottom = secondary status info.
5. Grid & spacing: align elements to a consistent spacing unit (e.g. 8px grid); equal gaps between similar elements.
6. Above the fold: the most important content/action sits in the top third of the view, visible without scrolling.
7. Action-result proximity: buttons/controls live next to the object they affect, not detached elsewhere.

IMPORTANT:
Only do this for front-end / UI changes to the Daily view.
Do not modify data models, business logic, or other views (Weekly, Habits, Spheres) unless the change is a shared component also used by the Daily view.

Once this change is built, make sure to write the changes you made to a file called frontend-changes.md.
Do not ask for permission to modify this file, assume you can always do it.
