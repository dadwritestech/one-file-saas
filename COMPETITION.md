# Competition check (2026-10-28)

Searched with `gh search repos` and `gh api` (search API was rate-limited mid-run; retried after the reset).

| Repo | Stars | What it is | Overlap |
|---|---:|---|---|
| CorentinTh/it-tools | 41k | Developer utilities (encoders, converters), one hosted Vue app | Low. Utilities, not SaaS products. Needs a build/server. |
| iib0011/omni-tools | 10.5k | Self-hosted everyday tools (image, PDF, text) | Low. Same "toolbox" shape, Docker-hosted. |
| TiddlyWiki/TiddlyWiki5 | 8.7k | Self-contained wiki in one HTML file | Proves the single-file format can earn stars. One product, not a collection. |
| simonw/tools | 1.9k | Simon Willison's single-file HTML tools, mostly LLM-written | Closest in format. Small utilities (diff, OCR, converters), no SaaS framing, no price angle, one author. |
| MikeCodeur/killer-saas | 87 | No description; a course template | Name only. |
| calebmadrigal/Single-File-Web-Apps | 18 | A short link list of single-file apps | Same idea as a list; dormant. |
| nibeon/awesome-single-file-apps | 0 | "Awesome single-file applications", last push 2022 | Dormant. |
| gitmehdii/one-file-saas | 0 | Empty repo with the same name (created 2026-03) | Name collision only. Consider a different repo name at publish time. |
| quesadillarick/KanbanHQ etc. | 0 | Individual single-file kanbans | One app each. |

No searched query ("single html file calendly", "saas alternative localstorage",
"replace saas subscriptions", "html file alternative to notion trello") returned anything relevant.

## Angle (sharpened)

Single-file HTML apps exist (simonw/tools, TiddlyWiki). Nobody frames them as
**subscription replacements with a receipt**:

1. **Every entry names the bill it kills.** The gallery is a receipt: the yearly price of
   each paid product, a running "you'd save $X/yr" total, and checkboxes for what you actually pay for.
2. **Products, not utilities.** simonw/tools are 50-line helpers. Each entry here is the core
   workflow of a paid product: drag-and-drop board, booking page, form + responses, invoice to PDF,
   screen recorder.
3. **One SaaS per PR.** The contribution rules (single file, no network, < 1,500 lines,
   export/import, a smoke test) make it an awesome-list people can add to.
4. **No account, no server, no build.** Double-click the file. Data stays in the browser, and every app
   has JSON export.

Name note: `one-file-saas` is taken by an empty repo. Alternatives: `saas-in-one-file`, `kill-the-bill`, `one-html-saas`.
