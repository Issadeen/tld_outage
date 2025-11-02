# Maintenance Request Console (Offline-ready, GitHub Pages)

A small, standalone web app you can host on GitHub Pages to keep processing maintenance (mechanical) requests during outages. Paste incoming WhatsApp messages, parse them into fields, save locally, and generate a PDF with an embedded QR code — all in the browser, no server required.

## Features
- Paste raw WhatsApp text (e.g., lines for Reg, Name, Phone, Company, Email)
- Auto-parse + editable fields
- One-click PDF generation (with QR payload: id, timestamp, reg, to, phone)
- Local history in your browser (localStorage)
- Export JSON/CSV
- PWA: works offline, installable on desktop/mobile
- Zero backend for core features: perfect for GitHub Pages
- Optional email sending via a tiny serverless endpoint (Vercel) that the page calls securely

## Folder
```
outage-site/
  index.html      # UI
  styles.css      # Styling
  app.js          # Logic: parse, storage, PDFs, QR
  sw.js           # Service worker (offline)
  manifest.webmanifest
  assets/icon.svg
```

## How to run locally
- Open `outage-site/index.html` in a browser
- Or serve the folder (e.g. with VS Code Live Server)

## Deploy to GitHub Pages
Option A (recommended): place this folder at repo root and enable Pages
- Commit `outage-site/` to your repo
- In GitHub: Settings → Pages → Deploy from branch
- Source: `main` (or your default), Folder: `/docs` or `/root`
- If using `/docs`, move the contents of `outage-site/` into `/docs`
- Your app will be at `https://<user>.github.io/<repo>/`

Option B: dedicated repo
- Create new repo, copy contents of `outage-site/` into root
- Enable GitHub Pages as above

## Using it
1) Paste the user message in the first panel
2) Click Parse, check/edit the fields
3) Save Entry (adds to local history) and/or Generate PDF
4) To send emails: click Send Email. On first use, you’ll be prompted for an Email API URL
5) Export JSON/CSV as needed

Tip: Works offline. You can install it (Add to Home Screen) for a native-like feel.

## Parsing assumptions
- First line is Registration(s), e.g. `KAX607C/ZD3849`
- An email line is detected via `user@domain` regex (accepts multiple, comma/space separated)
- A phone line is normalized to Kenyan format when possible (+254...)
- Remaining non-email/phone line becomes Company or Name depending on order
- All fields are editable before saving

## Security notes
- All core data is local to the browser (no uploads). Clear via the Clear All button.
- QR payload contains minimal metadata for verification.
- If you enable email sending, the PDF and metadata are sent to your serverless email endpoint only.

## Email sending setup (optional)

This app can send the generated PDF via email by calling a tiny serverless function (you deploy it separately). We included the example function under `outage-site/email-api/send-email.js` so all outage assets stay together in this folder.

1) Deploy the function (e.g., Vercel)
- Create or use a minimal serverless project and copy `outage-site/email-api/send-email.js` into it
- Route it at `/api/send-email` (or any path)
- Set environment variables in Vercel:
  - `SMTP_USER` and `SMTP_PASS` (or `SMTP_USERNAME`/`SMTP_PASSWORD`) – e.g., Gmail app password
  - Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` – if not using Gmail service
  - `FROM_EMAIL` – sender email (defaults to SMTP_USER)
  - `ALLOWED_ORIGIN` – your GitHub Pages origin, e.g., `https://<user>.github.io`

2) Configure the outage site (GitHub Pages stays static)
- Open the app and click Send Email once
- When prompted, paste your deployed API URL, e.g., `https://your-email-endpoint.example.com/api/send-email`
- The URL is saved to localStorage and can be changed by clearing it in the browser’s storage or re-entering when prompted

3) Use
- Fill the fields (ensure Email(s) has recipients)
- Click Send Email to have the API email the PDF attachment to the recipients

Notes
- Credentials live only in Vercel env vars (never exposed to the browser)
- CORS is restricted via `ALLOWED_ORIGIN`
- You can extend the function to CC default recipients or route to mailing lists

### Fallback (no server)
If you skip deploying an email API, clicking "Send Email" will:
- Download the PDF locally and
- Open your default email client prefilled with subject and body (you attach the PDF manually)
This keeps the outage site 100% static on GitHub Pages while still enabling email sending via your mail app.

## License
MIT
