# Fix our site header navigation for the audit findings

## Problem Description

Fix our site header navigation (`src/SiteNav.html`) for the findings in `docs/audit.md`. Write the corrected markup and describe the keyboard behaviour the script must implement.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/SiteNav.html ===============
<nav aria-label="Main">
  <ul role="menubar">
    <li role="none"><a role="menuitem" href="/" class="active">Home</a></li>
    <li role="none" class="has-dropdown">
      <a role="menuitem" href="#" aria-haspopup="true">Products</a>
      <ul role="menu" class="dropdown">  <!-- shown on :hover via CSS -->
        <li role="none"><a role="menuitem" href="/products/cloud">Cloud</a></li>
        <li role="none"><a role="menuitem" href="/products/edge">Edge</a></li>
      </ul>
    </li>
    <li role="none"><a role="menuitem" href="/pricing">Pricing</a></li>
  </ul>
</nav>

=============== FILE: docs/audit.md ===============
# Accessibility audit: header navigation
- Screen reader users hear "menu bar" and expect arrow keys to work; they don't, and Tab skips around oddly.
- Keyboard users cannot open the Products dropdown at all (it only opens on hover).
- Nothing tells screen reader users which page they are on.
- Once a dropdown is open there is no quick way to close it from the keyboard.
