# Repository Guidelines

## Project Structure & Module Organization
This repository is a GNOME Shell extension. `extension.js` contains the top-bar dropdown UI and translation logic. `prefs.js` defines the extension preferences for target languages. `schemas/` contains the GSettings schema, and `stylesheet.css` holds shell-specific styling. `flake.nix` defines the main Nix development shell.

## Build, Test, and Development Commands
Use Nix so `gjs`, Python, and GNOME libraries are available consistently.

- `nix develop`: enter the main development shell.
- `glib-compile-schemas schemas`: compile the extension GSettings schema.
- `gnome-extensions pack -f -o .dist .`: build installable extension zip.

If you change schema keys, re-run `glib-compile-schemas schemas` before testing in GNOME Shell.

## Coding Style & Naming Conventions
Follow existing conventions in both Python and GJS files:

- Use 4-space indentation and keep imports grouped at the top.
- Use lower camel case only where GNOME APIs require it.
- Use `CamelCase` for classes such as `TranslatorIndicator`.
- Keep shell UI labels concise and avoid adding controls for source language selection.

There is no formatter configured in this checkout, so keep changes stylistically consistent with the surrounding code.
