import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const LANGUAGES = [
    ['en', 'English'],
    ['de', 'German'],
    ['ru', 'Russian'],
    ['fr', 'French'],
    ['es', 'Spanish'],
    ['it', 'Italian'],
    ['tr', 'Turkish'],
    ['uk', 'Ukrainian'],
    ['pl', 'Polish'],
    ['cs', 'Czech'],
    ['ja', 'Japanese'],
    ['zh-CN', 'Chinese (Simplified)'],
    ['ko', 'Korean'],
];

export default class TranslatorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.set_title(_('GNOME Translator'));
        window.set_default_size(520, 640);

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Target languages'),
            description: _('The text you type is always auto-detected. Enable the languages you want as outputs.'),
        });

        for (const [code, name] of LANGUAGES) {
            const row = new Adw.SwitchRow({
                title: name,
                active: settings.get_strv('target-languages').includes(code),
            });

            row.connect('notify::active', widget => {
                const current = new Set(settings.get_strv('target-languages'));

                if (widget.active) {
                    current.add(code);
                } else {
                    current.delete(code);

                    if (current.size === 0) {
                        widget.active = true;
                        return;
                    }
                }

                settings.set_strv('target-languages', [...current]);
            });

            group.add(row);
        }

        page.add(group);

        // Keybinding group
        const keybindingGroup = new Adw.PreferencesGroup({
            title: _('Keyboard Shortcut'),
            description: _('Shortcut to open the translator panel'),
        });

        const shortcutRow = new Adw.ActionRow({
            title: _('Toggle Translator'),
            subtitle: this._getCurrentShortcut(settings),
        });

        const shortcutButton = new Adw.Button({
            label: _('Set Shortcut'),
            valign: 3, // GTK_ALIGN_CENTER
        });

        shortcutButton.connect('clicked', () => {
            this._showShortcutDialog(window, settings, shortcutRow);
        });

        shortcutRow.add_suffix(shortcutButton);
        shortcutRow.activatable_widget = shortcutButton;

        keybindingGroup.add(shortcutRow);
        page.add(keybindingGroup);

        window.add(page);
    }

    _getCurrentShortcut(settings) {
        const shortcuts = settings.get_strv('toggle-shortcut');
        return shortcuts.length > 0 ? shortcuts[0] : _('Not set');
    }

    _showShortcutDialog(parent, settings, row) {
        const dialog = new Adw.MessageDialog({
            heading: _('Set Keyboard Shortcut'),
            body: _('Press the desired key combination, or Escape to cancel'),
            transient_for: parent,
            modal: true,
        });

        dialog.add_response('cancel', _('Cancel'));

        const controller = new Gtk.EventControllerKey();
        
        controller.connect('key-pressed', (controller, keyval, keycode, state) => {
            if (keyval === Gdk.KEY_Escape) {
                dialog.close();
                return true;
            }

            const mask = state & Gtk.accelerator_get_default_mod_mask();
            
            if (!mask || keyval === Gdk.KEY_BackSpace) {
                return false;
            }

            const binding = Gtk.accelerator_name(keyval, mask);
            settings.set_strv('toggle-shortcut', [binding]);
            row.subtitle = binding;
            dialog.close();
            return true;
        });

        dialog.connect('map', () => {
            dialog.get_surface().add_controller(controller);
        });

        dialog.present();
    }
}
