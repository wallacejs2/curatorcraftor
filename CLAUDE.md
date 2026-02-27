# Craftor — AI Coding Instructions

## Project Overview

Craftor is an automotive HTML email builder. It generates table-based, email-client-compatible HTML using a **Hybrid-Fluid layout** technique. All generated email output must use this technique.

---

## The Hybrid-Fluid Layout Technique

### What it is

**Hybrid-Fluid** is the standard approach for multi-column HTML email layouts. It combines:

- **Fluid widths** (percentage-based `<td>` columns) so the layout fills any container naturally, and
- **A hard `max-width` cap** on the outer container so the email never exceeds 600 px on desktop, and
- **Outlook conditional comments** to force a fixed-width wrapper in Microsoft Outlook (which ignores `max-width`), and
- **`@media` query overrides** that force columns to `display: block; width: 100%` on mobile so they stack vertically.

### Why it matters — the common mistake

A naive two-column layout uses only `width: 50%` on each `<td>`. This works on desktop but **fails on mobile**: `<td>` elements are `display: table-cell` by default and do not wrap or stack on their own. Without an explicit `display: block !important` override inside a media query, both columns remain side-by-side on small screens, each only 50% wide and unreadable.

---

## Required HTML Skeleton

Every generated email must follow this exact skeleton:

```html
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">

  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
    table { border-collapse: collapse; }
    .email-container { width: 600px !important; }
  </style>
  <noscript><xml><o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->

  <style type="text/css">
    /* ── Resets ── */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td            { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img                  { -ms-interpolation-mode: bicubic; border: 0; height: auto;
                           line-height: 100%; outline: none; text-decoration: none; }
    body                 { height: 100% !important; margin: 0 !important;
                           padding: 0 !important; width: 100% !important; }
    #outlook a           { padding: 0; }
    .ExternalClass       { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span,
    .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }

    /* ── Mobile stacking ── */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: auto !important;
      }
      /* Forces percentage-width <td> columns to stack vertically on mobile */
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .mobile-stack:not(:last-child) {
        padding-bottom: 20px !important;
      }
      /* Hides decorative column spacer cells on mobile */
      .mobile-stack-spacer {
        display: none !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f5f5f7;">

  <!-- 100% fluid background wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:#f5f5f7;">
    <tr>
      <td align="center" valign="top" style="padding:15px 0;">

        <!-- Outlook fixed-width centering hack -->
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0"
               width="600" style="width:600px;">
        <tr><td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <!-- Hybrid-fluid container: 100% wide but capped at 600px -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%"
               class="email-container"
               style="max-width:600px;margin:0 auto;background-color:#ffffff;">
          <!-- SECTION ROWS GO HERE -->
        </table>

        <!--[if (gte mso 9)|(IE)]>
        </td></tr></table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Two-Column (Grid) Layout

### Correct pattern — Hybrid-Fluid

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <!-- Column 1: 49% on desktop, 100% block on mobile via .mobile-stack -->
    <td class="mobile-stack" width="49%" valign="top"
        style="width:49%; padding-right:8px; vertical-align:top;">
      <!-- column 1 content -->
    </td>
    <!-- Column 2 -->
    <td class="mobile-stack" width="49%" valign="top"
        style="width:49%; padding-left:8px; vertical-align:top;">
      <!-- column 2 content -->
    </td>
  </tr>
</table>
```

**Rules:**

| Rule | Detail |
|------|--------|
| Always add `class="mobile-stack"` | The media query turns each column into a full-width block on screens ≤ 600 px |
| Use `width="49%"` **and** `style="width:49%"` | The HTML attribute satisfies Outlook; the inline style satisfies modern clients |
| Clear gutters in the media query | `.mobile-stack` zeroes `padding-left` and `padding-right` automatically |
| Use `role="presentation"` on layout tables | Improves screen-reader accessibility |
| **Never** use `display:flex` or CSS Grid | Not supported by Outlook or many webmail clients |

### Wrong pattern — do NOT generate this

```html
<!-- ❌ WRONG: percentage columns with no mobile stacking override -->
<table width="100%">
  <tr>
    <td width="50%" style="width:50%;">…</td>
    <td width="50%" style="width:50%;">…</td>
  </tr>
</table>
```

This renders as two squished columns on mobile. It will never stack.

---

## Image-Left / Image-Right (Asymmetric) Layout

When an image column has a fixed pixel width, use a pixel value for that column and let the content column fill the remainder:

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <!-- Fixed-width image column -->
    <td width="180" class="mobile-stack mobile-padding-bottom" valign="top"
        style="width:180px; vertical-align:top;">
      <!-- image only -->
    </td>
    <!-- Fluid content column -->
    <td class="mobile-stack" valign="top"
        style="vertical-align:top; padding-left:15px;">
      <!-- text / buttons -->
    </td>
  </tr>
</table>
```

Add `class="mobile-padding-bottom"` to the image cell and define in the `<style>` block:

```css
@media screen and (max-width: 600px) {
  .mobile-padding-bottom { padding-bottom: 15px !important; }
}
```

---

## Outlook VML Buttons

Plain `<a>` tags render inconsistently as buttons in Outlook. Always use the VML + HTML conditional pattern:

```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
             xmlns:w="urn:schemas-microsoft-com:office:word"
             href="https://example.com"
             style="height:44px;v-text-anchor:middle;width:200px;"
             arcsize="18%" fillcolor="#007aff" strokecolor="none">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
    Button Text
  </center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="https://example.com"
   style="background-color:#007aff;color:#ffffff;display:block;
          font-family:Arial,sans-serif;font-size:16px;font-weight:bold;
          text-decoration:none;border-radius:8px;padding:12px 24px;
          text-align:center;"
   target="_blank">Button Text</a>
<!--<![endif]-->
```

---

## Quick-Reference Rules

1. **Outer shell**: always a 100%-wide `<table>` → `<td align="center">` → Outlook conditional → fluid container table with `max-width:600px`.
2. **Multi-column**: always use `.mobile-stack` on every `<td>` column.
3. **Percentages + pixel attrs**: set both the HTML `width` attribute and the inline `style` width.
4. **No modern CSS layout**: no `flexbox`, no `grid`, no `position:absolute`.
5. **No `<div>` wrappers** for layout — use tables only.
6. **Reset every image**: `border:0; height:auto; display:block; line-height:100%; outline:none; text-decoration:none;`
7. **Reset every table**: `border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;`
8. **Buttons**: VML for Outlook, `<a>` tag for everyone else — both wrapped in conditional comments.
9. **Preheader**: hidden `<div>` immediately after `<body>` with `max-height:0; overflow:hidden; opacity:0`.
10. **Test at 600 px and 375 px** — the layout must read well at both widths.
