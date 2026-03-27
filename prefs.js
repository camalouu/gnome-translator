import Adw from 'gi://Adw';

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
        window.add(page);
    }
}
