import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const DEFAULT_TARGETS = ['en', 'de', 'ru'];
const CURL_PATH = GLib.find_program_in_path('curl') ?? '/run/current-system/sw/bin/curl';
const DEBUG_LOG = '/tmp/gnome-translator.log';
const LANGUAGES = new Map([
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
]);

const ResultRow = GObject.registerClass(
class ResultRow extends PopupMenu.PopupBaseMenuItem {
    _init({targetName, text, error, onCopy, entryWidget, sectionWidget}) {
        super._init({activate: false});

        this._text = text;
        this._error = error;
        this._onCopy = onCopy;
        this._entryWidget = entryWidget;
        this._sectionWidget = sectionWidget;

        this.add_style_class_name('translator-result-item');

        const textBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'translator-result-box',
        });

        const languageLabel = new St.Label({
            text: targetName,
            style_class: 'translator-target-label',
            x_expand: true,
        });

        const resultLabel = new St.Label({
            text: error ?? text,
            style_class: error ? 'translator-result-error' : 'translator-result-label',
            x_expand: true,
        });
        resultLabel.clutter_text.line_wrap = true;

        textBox.add_child(languageLabel);
        textBox.add_child(resultLabel);
        this.add_child(textBox);

        const copyButton = new St.Button({
            style_class: 'translator-copy-button',
            can_focus: true,
            reactive: true,
            track_hover: true,
        });
        copyButton.set_child(new St.Icon({
            icon_name: 'edit-copy-symbolic',
            style_class: 'popup-menu-icon',
        }));
        copyButton.connect('clicked', () => {
            if (!error)
                onCopy(text);
        });
        this.add_child(copyButton);

        if (!error) {
            this.connect('activate', () => onCopy(text));
            this.reactive = true;
            this.can_focus = true;

            this.connect('key-press-event', (_actor, event) => {
                return this._handleKeyPress(event);
            });
        }
    }

    _handleKeyPress(event) {
        const symbol = event.get_key_symbol();

        if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
            if (!this._error) {
                this._onCopy(this._text);
            }
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Up) {
            const prev = this._getPreviousRow();
            if (prev) {
                prev.grab_key_focus();
            } else {
                this._entryWidget.grab_key_focus();
            }
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Down) {
            const next = this._getNextRow();
            if (next) {
                next.grab_key_focus();
            }
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _getPreviousRow() {
        const children = this._sectionWidget.box.get_children();
        const currentIndex = children.indexOf(this);
        
        for (let i = currentIndex - 1; i >= 0; i--) {
            const delegate = children[i]._delegate;
            if (delegate instanceof ResultRow && delegate.reactive && delegate.can_focus) {
                return delegate;
            }
        }
        return null;
    }

    _getNextRow() {
        const children = this._sectionWidget.box.get_children();
        const currentIndex = children.indexOf(this);
        
        for (let i = currentIndex + 1; i < children.length; i++) {
            const delegate = children[i]._delegate;
            if (delegate instanceof ResultRow && delegate.reactive && delegate.can_focus) {
                return delegate;
            }
        }
        return null;
    }
});

const TranslatorIndicator = GObject.registerClass(
class TranslatorIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, _('Translator'));

        this._extension = extension;
        this._settings = extension.getSettings();
        this._debounceId = 0;
        this._requestId = 0;

        const icon = new St.Icon({
            icon_name: 'preferences-desktop-locale-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(icon);

        this._buildMenu();
        this._runSelfTest();
    }

    _debug(message) {
        try {
            GLib.file_set_contents(DEBUG_LOG, `${message}\n`);
        } catch (_error) {
        }
    }

    _buildMenu() {
        this.menu.box.add_style_class_name('translator-menu');

        const entryItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        entryItem.add_style_class_name('translator-entry-item');

        this._entry = new St.Entry({
            hint_text: _('Type in any language'),
            style_class: 'translator-entry',
            can_focus: true,
            x_expand: true,
        });
        this._entry.clutter_text.connect('text-changed', () => this._queueTranslation());
        this._entry.clutter_text.connect('activate', () => this._copyResultFromEnter());
        this._entry.clutter_text.connect('key-press-event', (_actor, event) => {
            const symbol = event.get_key_symbol();
            
            if (symbol === Clutter.KEY_Escape) {
                this.menu.close();
                return Clutter.EVENT_STOP;
            }

            if (symbol === Clutter.KEY_Down) {
                const firstRow = this._getFirstCopyableResultRow();
                if (firstRow) {
                    firstRow.grab_key_focus();
                    return Clutter.EVENT_STOP;
                }
            }

            return Clutter.EVENT_PROPAGATE;
        });
        entryItem.add_child(this._entry);
        this.menu.addMenuItem(entryItem);

        const hintItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        this._hintLabel = new St.Label({
            text: _('Source language is detected automatically.'),
            style_class: 'translator-hint-label',
            x_expand: true,
        });
        hintItem.add_child(this._hintLabel);
        this.menu.addMenuItem(hintItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._resultsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._resultsSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction(_('Preferences'), () => this._extension.openPreferences());

        this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen) {
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this._entry.grab_key_focus();
                    return GLib.SOURCE_REMOVE;
                });
            } else {
                this._resetTransientState();
            }
        });

        this._showIdleState();
    }

    toggleMenu() {
        if (this.menu.isOpen)
            this.menu.close();
        else
            this.menu.open();
    }

    _queueTranslation() {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }

        const text = this._entry.get_text().trim();
        if (!text) {
            this._showIdleState();
            return;
        }

        this._hintLabel.text = _('Translating…');
        this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 350, () => {
            this._debounceId = 0;
            this._translate(text);
            return GLib.SOURCE_REMOVE;
        });
    }

    _translate(text) {
        const targets = this._settings.get_strv('target-languages');
        const activeTargets = targets.length > 0 ? targets : DEFAULT_TARGETS;
        const requestId = ++this._requestId;

        if (!GLib.file_test(CURL_PATH, GLib.FileTest.EXISTS)) {
            const message = `Translator backend not found: ${CURL_PATH}`;
            log(`GNOME Translator: ${message}`);
            this._debug(message);
            this._showMessage(message);
            return;
        }

        Promise.all(activeTargets.map(target => this._translateTarget(text, target)))
            .then(results => {
                if (requestId !== this._requestId || this._entry.get_text().trim() !== text)
                    return;

                this._debug(`translate ok text=${text} results=${results.length}`);
                this._showResults(results);
            })
            .catch(error => {
                this._debug(`translate exception ${error.message}`);
                if (requestId === this._requestId)
                    this._showMessage(error.message);
            });
    }

    _runSelfTest() {
        this._translateTarget('Hallo Welt', 'en')
            .then(result => {
                if (result.error)
                    log(`GNOME Translator self-test failed: ${result.error}`);
                else
                    log(`GNOME Translator self-test ok: ${result.text}`);
                this._debug(`self-test ${result.error ?? result.text}`);
            })
            .catch(error => {
                log(`GNOME Translator self-test exception: ${error.message}`);
                this._debug(`self-test exception ${error.message}`);
            });
    }

    _translateTarget(text, target) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
        const proc = Gio.Subprocess.new(
            [CURL_PATH, '-s', url],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        return new Promise((resolve, reject) => {
            proc.communicate_utf8_async(null, null, (_proc, res) => {
                try {
                    const [, stdout, stderr] = proc.communicate_utf8_finish(res);

                    if (proc.get_exit_status() !== 0)
                        throw new Error(stderr.trim() || _('Translation failed.'));

                    const payload = JSON.parse(stdout);
                    const translated = Array.isArray(payload[0])
                        ? payload[0].map(chunk => chunk[0] ?? '').join('')
                        : '';

                    resolve({
                        target,
                        target_name: LANGUAGES.get(target) ?? target,
                        text: translated,
                    });
                } catch (error) {
                    log(`GNOME Translator: translation failed for ${target}: ${error.message}`);
                    this._debug(`translate target=${target} error=${error.message}`);
                    resolve({
                        target,
                        target_name: LANGUAGES.get(target) ?? target,
                        error: error.message,
                    });
                }
            });
        });
    }

    _showIdleState() {
        this._hintLabel.text = _('Source language is detected automatically.');
        this._clearResults();
        this._showMessage(_('Start typing to see translations.'));
    }

    _showMessage(message) {
        this._clearResults();
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        item.add_style_class_name('translator-placeholder-item');
        item.add_child(new St.Label({
            text: message,
            style_class: 'translator-placeholder-label',
            x_expand: true,
        }));
        this._resultsSection.addMenuItem(item);
    }

    _showResults(results) {
        this._clearResults();

        if (results.length === 0) {
            this._showMessage(_('No target languages are enabled.'));
            return;
        }

        for (const result of results) {
            const row = new ResultRow({
                targetName: result.target_name ?? LANGUAGES.get(result.target) ?? result.target,
                text: result.text ?? '',
                error: result.error ?? null,
                onCopy: value => this._copyAndClose(value),
                entryWidget: this._entry,
                sectionWidget: this._resultsSection,
            });
            this._resultsSection.addMenuItem(row);
        }
    }

    _resetTransientState() {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        this._requestId++;
        if (this._entry.get_text())
            this._entry.set_text('');
        this._showIdleState();
    }

    _findResultRowForActor(actor) {
        let current = actor;
        while (current) {
            const delegate = current._delegate;
            if (delegate instanceof ResultRow)
                return delegate.reactive ? delegate : null;
            current = current.get_parent();
        }
        return null;
    }

    _getFocusedResultRow() {
        const focusedActor = global.stage.get_key_focus();
        if (!focusedActor)
            return null;

        return this._findResultRowForActor(focusedActor);
    }

    _getFirstCopyableResultRow() {
        for (const child of this._resultsSection.box.get_children()) {
            const delegate = child._delegate;
            if (delegate instanceof ResultRow && delegate.reactive)
                return delegate;
        }
        return null;
    }

    _copyResultFromEnter() {
        const row = this._getFocusedResultRow() ?? this._getFirstCopyableResultRow();
        if (!row)
            return;

        row.activate(Clutter.get_current_event());
    }

    _copyAndClose(text) {
        this._copyText(text);
        this.menu.close();
    }

    _copyText(text) {
        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
    }

    _clearResults() {
        this._resultsSection.removeAll();
    }

    destroy() {
        if (this._debounceId)
            GLib.source_remove(this._debounceId);

        super.destroy();
    }
});

export default class GnomeTranslatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new TranslatorIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
        log(`GNOME Translator: enabled with curl at ${CURL_PATH}`);
        this._indicator._debug(`enabled curl=${CURL_PATH}`);

        Main.wm.addKeybinding(
            'toggle-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._indicator.toggleMenu()
        );
    }

    disable() {
        Main.wm.removeKeybinding('toggle-shortcut');
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
