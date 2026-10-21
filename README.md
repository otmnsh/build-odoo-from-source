# Build Odoo from Source

A static web app that generates scripts to **install, run and remove [Odoo](https://www.odoo.com) Community from source** on Linux. Pick a version and a distribution, tweak a few options, and copy, download or share the result.

Everything runs in your browser. There is no backend, no analytics, no cookies and no external requests: the page is three static files.

Inspired by [build-python-from-source.com](https://www.build-python-from-source.com/) (MyDjango.cz), which does the same job for CPython.

## What it generates

The output panel has three tabs:

| Tab | File | What it does |
| --- | --- | --- |
| **Install script** | `build-odoo-<version>-<distro>.sh` | Installs build dependencies, clones Odoo, creates a virtualenv, installs the Python requirements, writes the config with a generated master password, optionally sets up PostgreSQL, a first database and a systemd service. |
| **Fish start/stop** | `odoo.fish` | Fish functions: `odoo-start`, `odoo-stop`, `odoo-restart`, `odoo-status`, `odoo-logs`. Uses `systemctl` and `journalctl` when you chose the systemd service, otherwise runs Odoo in the background with its own log file. |
| **Purge Odoo** | `purge-odoo-<version>-<distro>.sh` | Removes an installation made by the install script. Prints exactly what it will delete and requires you to type `purge odoo`. |

### Supported

- **Odoo:** 19.0, 18.0, 17.0, 16.0, or any branch or tag you type under *Advanced*.
- **Distributions:** Ubuntu, Debian, Fedora, RHEL / AlmaLinux / Rocky (dnf), Arch Linux.
- **Install modes:** system-wide (dedicated `odoo` user, `/opt/odoo`, optional systemd service, uses sudo) or just for you (`~/odoo`, no sudo; admin-only steps are written as comments).

### Install script options

PostgreSQL install and role, wkhtmltopdf, rtlcss, systemd service, shallow clone, HTTP port, install folder, service user, first database (no demo data), workers, proxy mode, `list_db`, Git branch or tag, and a Git mirror URL for networks where GitHub is unreachable.

### Purge options

Drop databases (explicit names, or every database owned by the service user on a system install), drop the PostgreSQL role, keep `custom-addons` (moved to your home folder), uninstall rtlcss, remove the filestore (user installs), remove the service user, and, off by default, uninstall PostgreSQL itself. Build dependencies and wkhtmltopdf are never removed because other software may use them.

## Run it

It is plain HTML, CSS and JavaScript. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # or: npm run serve
```

Deploy by uploading the three files (`index.html`, `styles.css`, `app.js`) to any static host, for example GitHub Pages.

## Share links

All state lives in the URL query string, so a configured page can be bookmarked or shared. Only values that differ from the defaults are written.

| Param | Meaning |
| --- | --- |
| `v` | Odoo version (`19.0`, `18.0`, `17.0`, `16.0`) |
| `os` | `ubuntu`, `debian`, `fedora`, `rhel`, `arch` |
| `mode` | `system` or `user` |
| `tab` | `install`, `fish` or `purge` |
| `port`, `dir`, `user`, `db`, `workers`, `branch`, `repo` | Text settings |
| `pg`, `wk`, `rtl`, `svc`, `shallow`, `proxy`, `listdb` | Install toggles (`1` or `0`) |
| `ppdb`, `pdbs`, `prole`, `pkeep`, `prtl`, `pfs`, `puser`, `ppg` | Purge options (`pdbs` is a space-separated list of database names) |

Example: `?v=19.0&os=debian&mode=user&tab=purge`

## Project layout

```
index.html     page shell, SEO metadata and JSON-LD structured data
styles.css     theme (deep blue gradient, gold accents, light code box)
app.js         data tables, script generators and UI
tools/check.js generates every variant and syntax-checks it
package.json   scripts only, no dependencies
```

### How `app.js` is organised

1. **Data:** versions, distributions (package manager), toggle descriptors (`TG`, `ADV`, `PTG`) and the per-package-manager dependency lists (`P`, `PG`).
2. **`model(state)`:** validates and sanitises user input (paths, ports, names, URLs) and derives the install folder, Python requirement and so on.
3. **Generators:** `gen()` (install), `fish()` and `purge()` build the scripts as arrays of lines. `OUT` maps each tab to its generator and filename.
4. **UI:** renders the controls from the descriptors, keeps the URL in sync, and wires copy, download and share.

### Adding a distribution

Add an entry to `OS`, a dependency list to `P` and `PG` if it uses a new package manager, then handle the new `pm` in `deps()` and in the PostgreSQL branch of `purge()`.

### Adding an Odoo version

Add it to `VERS`. The Python minimum is set in `model()` (`minpy`, `pyv`).

### Checking the output

```sh
npm run check     # or: node tools/check.js
```

This generates all 160 combinations of version, distribution, install mode and option set, and runs `bash -n` on the install and purge scripts. If `fish` is installed, it also runs `fish -n` on the fish files. It checks syntax only. It does not run the scripts.

## Safety notes

- **Read the scripts before you run them.** They use `sudo`, create a system user and write under `/opt` or your home folder.
- The install script starts with `set -euo pipefail` and can be re-run: it skips an existing clone and an existing config file.
- The master password is generated on your machine with `openssl rand`, stored only in the config file (mode 640 or 600) and never printed.
- The purge script refuses to run on `/`, an empty path or `$HOME`, and asks for a typed confirmation.
- The generated scripts have **not** been tested on every distribution and version. Try them on a disposable VM or container first.

## Known limitations

- No Odoo Enterprise addons, reverse proxy or TLS setup.
- wkhtmltopdf comes from your distribution, which may be missing or built without the patched Qt that Odoo recommends for PDF headers and footers.
- Arch (and any distribution with a very new Python) may not build the pinned requirements of older Odoo versions.
- The Odoo version list is maintained by hand. Use *Advanced* to enter a newer branch.

## Before you publish

- In `index.html`, replace the LinkedIn link in the footer (it currently points to a people search) with your profile URL.
- Add `url` (and `sameAs` for the creator) to the JSON-LD block, plus a `<link rel="canonical">`, once you know the deployed address.
- Choose and add a `LICENSE` file.

## License

Not chosen yet. Add a `LICENSE` file and update this section.

Odoo is a trademark of Odoo S.A. This project is independent and not affiliated with or endorsed by Odoo S.A.

Made with ♥ by Otmane Echaibi.
