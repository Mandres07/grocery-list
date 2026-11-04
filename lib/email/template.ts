import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import theme from "@/styles/theme.json";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// Tables and inline styles keep the shared branding usable in email clients
// that do not support the site's CSS variables or Tailwind utilities.
export function buildActionEmail({ subject, title, description, actionLabel, url, expiry }: {
  subject: string; title: string; description: string; actionLabel: string; url: string; expiry: string;
}): EmailContent {
  const c = theme.colors;
  const s = theme.sizes;
  const link = escapeHtml(url);
  return {
    subject,
    text: `${APP_NAME}\n${title}\n\n${description}\n\n${actionLabel}: ${url}\n\n${expiry}\nSi no esperabas este correo, puedes ignorarlo.\n\n${APP_TAGLINE}`,
    html: `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:${c.background};color:${c.foreground};font-family:${theme.fonts.sans}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.background}"><tr><td align="center" style="padding:${s['space-md']} ${s['space-sm']}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${s.content}">
<tr><td style="padding:0 0 ${s['space-md']};font-size:${s['text-body']};font-weight:bold"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:${s['space-sm']}"><img src="cid:brand-basket" alt="" width="${parseInt(s['brand-mark'])}" height="${parseInt(s['brand-mark'])}" style="display:block;border:0"></td><td>${APP_NAME}</td></tr></table></td></tr>
<tr><td style="padding:${s['space-md']};background:${c.surface};border:1px solid ${c.line};border-radius:${s['radius-panel']}">
<h1 style="margin:0 0 ${s['space-md']};font-family:${escapeHtml(theme.fonts.display)};font-size:${s['text-title']};line-height:1.2">${escapeHtml(title)}</h1>
<p style="font-size:${s['text-body']};line-height:1.7;color:${c.muted}">${escapeHtml(description)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:${s['space-md']} 0"><tr><td bgcolor="${c.brand}" style="border-radius:${s['radius-panel']}"><a href="${link}" style="display:inline-block;padding:${s['space-sm']} ${s['space-md']};font-size:${s['text-body']};font-weight:bold;color:${c.surface};text-decoration:none">${escapeHtml(actionLabel)}</a></td></tr></table>
<p style="font-size:${s['text-small']};line-height:1.6;color:${c.muted}">${escapeHtml(expiry)} Si no esperabas este correo, puedes ignorarlo.</p>
<p style="font-size:${s['text-small']};line-height:1.6;color:${c.muted}">Si el botón no funciona, copia este enlace:<br><a href="${link}" style="color:${c.brand};overflow-wrap:anywhere;word-break:break-all">${link}</a></p>
</td></tr><tr><td align="center" style="padding:${s['space-md']};font-size:${s['text-small']};color:${c.muted}">${APP_TAGLINE}</td></tr>
</table></td></tr></table></body></html>`,
  };
}
