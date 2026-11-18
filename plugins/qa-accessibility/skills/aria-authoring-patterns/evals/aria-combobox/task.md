# Review and fix the city picker

## Problem Description

Review and fix the city picker in `src/city-picker.html` (`notes.md`), and write tests for its keyboard and ARIA behaviour.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/city-picker.html ===============
<div role="combobox" aria-owns="city-list" aria-haspopup="listbox">
  <input id="city" type="text" placeholder="City" autocomplete="off">
</div>
<ul id="city-list" role="listbox" hidden></ul>

<script>
  const input = document.getElementById('city');
  const list = document.getElementById('city-list');
  const CITIES = ['Berlin', 'Bern', 'Bergen', 'Bilbao', 'Bologna'];

  function render(items) {
    list.innerHTML = items.map((c) => `<li role="option" tabindex="0">${c}</li>`).join('');
  }
  input.addEventListener('input', () => {
    render(CITIES.filter((c) => c.toLowerCase().startsWith(input.value.toLowerCase())));
    list.hidden = false;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') list.querySelector('[role=option]')?.focus();
  });
  list.addEventListener('click', (e) => {
    input.value = e.target.textContent;
    list.hidden = true;
  });
</script>

=============== FILE: notes.md ===============
- Screen reader users hear "edit text, City" with no hint that suggestions exist.
- After pressing Down, VoiceOver leaves the field; typing more letters goes nowhere.
- Escape does nothing, and Enter on a suggestion does nothing.
