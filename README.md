# GNOME Translator

A GNOME Shell extension that lives in the top bar, providing instant multi-language translation.

## The Killer Feature 🚀

**Multi-language translation in real-time.** Perfect for people who don't speak one language perfectly and want to see translations in multiple languages simultaneously to truly understand the input.

Type anything in any language—source is auto-detected—and see instant translations across all your enabled target languages. No more switching between languages in translation apps. See Spanish, French, German, Japanese (or whatever languages you pick) all at once. Compare nuances, understand context, grasp meaning from multiple perspectives simultaneously.

This is translation for **understanding**, not just converting words.

## Development Shell

```bash
nix develop
```

Running `nix develop` only prepares tooling (it does **not** install or enable the extension automatically).

## Build, install, and enable like a normal extension

From the project root:

```bash
glib-compile-schemas schemas
gnome-extensions pack -f -o .dist .
gnome-extensions install -f .dist/gnome-translator-v2@viktor.shell-extension.zip
gnome-extensions enable gnome-translator-v2@viktor
```

Reload GNOME Shell (X11: `Alt+F2`, then `r`; Wayland: log out/in) and the icon should appear in the top bar.

## Why it stayed enabled after logout

This is normal GNOME behavior. Enabled extensions are persisted in `org.gnome.shell enabled-extensions`, so they remain enabled across logins until you disable them explicitly.

To disable:

```bash
gnome-extensions disable gnome-translator-v2@viktor
```

## System impact / conflicts

This extension:

- runs in GNOME Shell JS runtime like any other extension
- adds one panel button and one keybinding (`<Super>semicolon`)
- stores only its own settings schema keys
- calls `curl` to fetch translations from Google Translate API endpoint

It should not conflict with unrelated system services. Main conflict risk is only keybinding overlap with another extension/app.

## Preferences

Open the extension preferences and enable the output languages you want. At least one target language must remain enabled.

---

_*This project was totally vibe coded._
