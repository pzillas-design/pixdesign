// Google Ads Conversion Tracking
// Conversion Labels aus Google Ads UI: Tools > Conversions > Conversion-Aktion erstellen
// Dann hier eintragen (Format: AW-XXXXXXXXX/alphanumLabel)

declare function gtag(...args: unknown[]): void;

function fireConversion(label: string) {
  if (typeof gtag === 'undefined') return;
  gtag('event', 'conversion', { send_to: label });
}

// Kontakt-Events — Labels nach Erstellung in Google Ads hier eintragen
export function trackPhoneClick() {
  fireConversion('AW-627992730/cZ2PCPihorMcEJrRuasC');
}

export function trackWhatsAppClick() {
  fireConversion('AW-627992730/0heXCN-XubMcEJrRuasC');
}

export function trackEmailClick() {
  fireConversion('AW-627992730/-sxkCOKXubMcEJrRuasC');
}

export function trackInquirySent() {
  fireConversion('AW-627992730/XKE1COWXubMcEJrRuasC');
}
