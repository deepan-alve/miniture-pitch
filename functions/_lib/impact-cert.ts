// Impact certificate generator.
//
// Inputs come from the donate path (donation_records joined to its return
// request → owned_unit → product → account → ngo). Output is an SVG string
// that can be uploaded as-is to Nhost Storage. Browsers and most PDF
// renderers handle inline SVG well — the demo never actually rasterises.
//
// Style: matches the Miniture palette in `app/constants/theme.ts`:
//   bg     #FAF6F0 (warm cream)
//   orange #E8722C (primary accent)
//   ink    #1F1B16 (near-black for text)

export interface ImpactCertInput {
  parentName: string;
  productTitle: string;
  productImageUrl?: string;
  ngoName: string;
  ngoLogoUrl?: string;
  dateIso: string; // ISO 8601 — we render the date portion only
  certificateId?: string; // appears in the corner; usually the donation_record_id
}

const BG = '#FAF6F0';
const ORANGE = '#E8722C';
const ORANGE_SOFT = '#F5C8A8';
const INK = '#1F1B16';
const INK_DIM = '#5A4F44';

/** Escapes string content for safe embedding in XML/SVG text nodes. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function renderImpactCertificate(input: ImpactCertInput): string {
  const parent = xmlEscape(input.parentName);
  const product = xmlEscape(input.productTitle);
  const ngo = xmlEscape(input.ngoName);
  const date = xmlEscape(formatDate(input.dateIso));
  const certId = xmlEscape((input.certificateId ?? '').slice(0, 13));

  const productImage = input.productImageUrl
    ? `<image href="${xmlEscape(input.productImageUrl)}" x="120" y="340" width="280" height="280"
            preserveAspectRatio="xMidYMid slice" clip-path="url(#productClip)"/>`
    : `<rect x="120" y="340" width="280" height="280" rx="24" fill="${ORANGE_SOFT}"/>
       <text x="260" y="490" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
             font-size="20" fill="${INK_DIM}">Miniture product</text>`;

  const ngoLogo = input.ngoLogoUrl
    ? `<image href="${xmlEscape(input.ngoLogoUrl)}" x="980" y="690" width="80" height="80"
            preserveAspectRatio="xMidYMid meet"/>`
    : '';

  // The whole document is a single SVG string. Layout numbers are tuned for
  // 1200x800; if you change canvas dims, redo the text anchors.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <clipPath id="productClip">
      <rect x="120" y="340" width="280" height="280" rx="24"/>
    </clipPath>
    <linearGradient id="cornerOrange" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${ORANGE}" stop-opacity="0.5"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="800" fill="${BG}"/>

  <!-- Decorative orange accents -->
  <path d="M0,0 L420,0 L0,420 Z" fill="url(#cornerOrange)" opacity="0.18"/>
  <circle cx="1140" cy="80" r="180" fill="${ORANGE}" opacity="0.08"/>
  <circle cx="60" cy="780" r="120" fill="${ORANGE}" opacity="0.10"/>
  <rect x="80" y="80" width="1040" height="640" rx="32" fill="none" stroke="${ORANGE}"
        stroke-width="2" stroke-dasharray="6 8" opacity="0.45"/>

  <!-- Eyebrow -->
  <text x="120" y="170" font-family="Inter, system-ui, sans-serif"
        font-size="18" font-weight="600" letter-spacing="3" fill="${ORANGE}">
    IMPACT CERTIFICATE
  </text>

  <!-- Title -->
  <text x="120" y="240" font-family="Georgia, 'Times New Roman', serif"
        font-size="56" font-weight="700" fill="${INK}">
    Thank you, ${parent}.
  </text>

  <!-- Sub -->
  <text x="120" y="290" font-family="Inter, system-ui, sans-serif"
        font-size="22" fill="${INK_DIM}">
    Your gift is now in the hands of children who need it most.
  </text>

  <!-- Product card -->
  ${productImage}

  <!-- Story copy (right of product image) -->
  <g font-family="Inter, system-ui, sans-serif" fill="${INK}">
    <text x="450" y="380" font-size="28" font-weight="600">Your</text>
    <text x="450" y="420" font-size="36" font-weight="700" fill="${ORANGE}">${product}</text>
    <text x="450" y="470" font-size="24">is now bringing joy at</text>
    <text x="450" y="510" font-size="32" font-weight="700">${ngo}.</text>

    <text x="450" y="565" font-size="18" fill="${INK_DIM}" font-style="italic">
      Every Miniture product gets a second life. This one's just beginning its.
    </text>
  </g>

  <!-- Footer rule -->
  <line x1="120" y1="690" x2="1080" y2="690" stroke="${ORANGE}" stroke-width="1" opacity="0.3"/>

  <!-- Footer left: date -->
  <text x="120" y="730" font-family="Inter, system-ui, sans-serif"
        font-size="14" fill="${INK_DIM}">
    Issued ${date}
  </text>
  <text x="120" y="752" font-family="Inter, system-ui, sans-serif"
        font-size="11" fill="${INK_DIM}" opacity="0.7">
    Certificate ID: ${certId || 'pending'}
  </text>

  <!-- Footer middle: Miniture wordmark -->
  <text x="600" y="740" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="32" font-weight="700" fill="${INK}">
    miniture
  </text>
  <text x="600" y="765" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif"
        font-size="11" fill="${INK_DIM}" letter-spacing="2">
    Buyback &amp; Renewed
  </text>

  <!-- Footer right: NGO logo -->
  ${ngoLogo}
</svg>`;
}

/**
 * Upload the SVG to Nhost Storage and return the public URL.
 *
 * We use the storage REST API directly with the admin secret. The cert lives
 * in a public bucket so the parent can share the link.
 */
export async function uploadImpactCertificate(opts: {
  storageUrl: string; // e.g. https://<sub>.storage.<region>.nhost.run/v1
  adminSecret: string;
  donationRecordId: string;
  svg: string;
  bucketId?: string;
}): Promise<string> {
  const bucketId = opts.bucketId ?? 'default';
  const fileName = `${opts.donationRecordId}.svg`;
  const fileId = opts.donationRecordId; // make file id == donation id for stable URL

  const form = new FormData();
  form.append(
    'file[]',
    new Blob([opts.svg], { type: 'image/svg+xml' }),
    fileName,
  );
  form.append(
    'metadata[]',
    JSON.stringify({ id: fileId, name: `impact-certs/${fileName}`, bucketId }),
  );

  const url = `${opts.storageUrl.replace(/\/$/, '')}/files`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-hasura-admin-secret': opts.adminSecret },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Storage upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { processedFiles?: Array<{ id: string }> };
  const id = json.processedFiles?.[0]?.id ?? fileId;
  // Public URL pattern for Nhost Storage v1 is /files/<id>/presignedurl OR
  // /files/<id> (direct). For the demo we expose the direct route since the
  // file is small and public.
  return `${opts.storageUrl.replace(/\/$/, '')}/files/${id}`;
}
