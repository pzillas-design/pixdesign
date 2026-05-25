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
  fireConversion('AW-9121611929/PHONE_LABEL'); // ← Label aus Google Ads ersetzen
}

export function trackWhatsAppClick() {
  fireConversion('AW-9121611929/WHATSAPP_LABEL'); // ← Label aus Google Ads ersetzen
}

export function trackEmailClick() {
  fireConversion('AW-9121611929/EMAIL_LABEL'); // ← Label aus Google Ads ersetzen
}

export function trackInquirySent() {
  fireConversion('AW-9121611929/INQUIRY_LABEL'); // ← Label aus Google Ads ersetzen
}
