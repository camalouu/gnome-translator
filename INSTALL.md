# Installation Guide

## Quick Install

1. **Enter the development environment:**
   ```bash
   nix develop
   ```

2. **Build the extension:**
   ```bash
   glib-compile-schemas schemas
   gnome-extensions pack -f -o .dist .
   ```

3. **Install and enable:**
   ```bash
   gnome-extensions install -f .dist/gnome-translator@camalouu.shell-extension.zip
   gnome-extensions enable gnome-translator@camalouu
   ```

4. **Reload GNOME Shell:**
   - **X11:** Press `Alt+F2`, type `r`, and press Enter
   - **Wayland:** Log out and log back in

5. **Configure (optional):**
   - Open GNOME Extensions app or run:
     ```bash
     gnome-extensions prefs gnome-translator@camalouu
     ```
   - Select your target languages
   - Customize the keyboard shortcut (default: `Super+Shift+;`)

## Usage

Press `Super+Shift+;` (or your custom shortcut) to open the translator panel in the top bar. Type any text, and it will be auto-translated to all your selected target languages simultaneously.

## Uninstall

```bash
gnome-extensions disable gnome-translator@camalouu
gnome-extensions uninstall gnome-translator@camalouu
```
