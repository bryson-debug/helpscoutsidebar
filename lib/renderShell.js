// Server-rendered HTML shell for the sidebar iframe. api/app.js only serves
// this after verifying the HelpScout signature, so the embedded config is
// trusted to reach a legitimate iframe load.
export function renderShell({ sessionToken, allowedMailboxName, allowedMailboxId }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flodesk Sidebar</title>
    <link rel="stylesheet" href="/assets/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__CONFIG__ = ${JSON.stringify({ sessionToken, allowedMailboxName, allowedMailboxId })};
    </script>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>
`
}
