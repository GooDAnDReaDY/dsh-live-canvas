# Changelog

Notable changes to `@goodandready/dsh-live-canvas`.

## 0.2.20

### Fixed
- Settings no longer wait on the removed settingsScope service. The client uses configForms (#135).

## 0.2.19

### Fixed
- **Settings form can open.** The host registered the package name as the
  settings namespace. That name contains `@` and `/`, and the settings service
  only accepts a lowercase hyphenated identifier, so the form stayed on
  "unavailable". The namespace is now `dsh-live-canvas` on both sides.

## 0.2.18

### Fixed
- **Plugin page opens instead of showing a component error.** The settings card
  read the settings service before the client declared it, and the Plugins page
  mounts that card twice: once as the one-line description and once as the form.
  Both copies crashed. The client now declares the settings service. The
  description stays a single line under the title, and the form shows a loading
  or unavailable state when the service is not ready.

## 0.2.17

### Fixed
- **Settings reachable again on the plugin's own page**: the current DSH core
  (0.1.6-alpha.2) renders a plugin's configuration page only for entries registered
  in the plugin-list seat `plugins.item`. The view-aware card is now registered there
  (`id: 'dsh-live-canvas'`, order 60, static label); the row seat and the legacy
  `settings.plugin.item` card stay as fallbacks.

## 0.2.16

### Fixed
- **Settings reachable again**: the card registered into `settings.plugin.item`, a
  slot the current DSH core (0.1.6-alpha.2) no longer renders, so the plugin's
  settings were unreachable. The surface now registers into the Plugins page row
  seat `plugins.row.config` first, keyed
  `@goodandready/dsh-live-canvas#dsh-live-canvas` (`rowConfigKey(package, rowId)`):
  the plugin's row gains a configure control whose page is the settings form
  (`view: 'page'`, open and without our card chrome — the host page draws the title,
  icon, crumb and padding) plus a one-line state for `view: 'summary'`. The legacy
  seat stays registered as a fallback for older cores.

### Added
- This changelog.
