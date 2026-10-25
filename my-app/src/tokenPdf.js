/**
 * Pure JavaScript PDF generator for Safeguarding Secure Thread Tokens
 * Generates an authentic, standard PDF-1.4 document without external dependencies.
 */

export function generateTokenPdf({ token, topic, date, reportedStaff }) {
  const sanitize = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/[^\x20-\x7E]/g, ' ') // keep printable ASCII characters
      .replace(/[()\\]/g, '\\$&');   // escape PDF parentheses and backslashes
  };

  const safeToken = sanitize(token || 'N/A');
  const now = sanitize(date || new Date().toLocaleString());
  const safeTopic = topic ? sanitize(topic) : null;
  const safeStaff = reportedStaff ? sanitize(reportedStaff) : null;

  const content = [];

  // Header Accent Rule (Restrained Teal)
  content.push('0.06 0.46 0.43 rg');
  content.push('50 735 512 3 re f');

  // Document Title & Subtitle
  content.push('BT');
  content.push('/F1 18 Tf');
  content.push('0.06 0.09 0.16 rg');
  content.push('50 748 Td');
  content.push('(SAFEGUARDING CONFIDENTIAL REPORTING) Tj');
  content.push('ET');

  content.push('BT');
  content.push('/F1 10.5 Tf');
  content.push('0.4 0.45 0.55 rg');
  content.push('50 714 Td');
  content.push('(Official Secure Thread Token & Follow-Up Receipt) Tj');
  content.push('ET');

  // Confidentiality Notice Card
  content.push('0.97 0.98 0.99 rg');
  content.push('0.89 0.91 0.94 RG');
  content.push('1 w');
  content.push('50 635 512 62 re B');

  content.push('BT');
  content.push('/F1 9 Tf');
  content.push('0.06 0.46 0.43 rg');
  content.push('65 677 Td');
  content.push('(CONFIDENTIAL CREDENTIAL - KEEP THIS DOCUMENT IN A SECURE LOCATION) Tj');
  content.push('ET');

  content.push('BT');
  content.push('/F1 8.5 Tf');
  content.push('0.25 0.3 0.35 rg');
  content.push('65 660 Td');
  content.push('(This token is your only key to follow up on your report or review administrator replies.) Tj');
  content.push('ET');

  content.push('BT');
  content.push('/F1 8.5 Tf');
  content.push('0.25 0.3 0.35 rg');
  content.push('65 645 Td');
  content.push('(Due to zero-knowledge privacy protection, lost tokens cannot be recovered.) Tj');
  content.push('ET');

  // Token Box
  content.push('0.95 0.98 0.98 rg');
  content.push('0.06 0.46 0.43 RG');
  content.push('1.5 w');
  content.push('50 540 512 75 re B');

  content.push('BT');
  content.push('/F1 10 Tf');
  content.push('0.06 0.46 0.43 rg');
  content.push('70 590 Td');
  content.push('(YOUR SECURE THREAD TOKEN) Tj');
  content.push('ET');

  content.push('BT');
  content.push('/F2 15 Tf');
  content.push('0.06 0.09 0.16 rg');
  content.push('70 560 Td');
  content.push('(' + safeToken + ') Tj');
  content.push('ET');

  // Report Information Section
  content.push('BT');
  content.push('/F1 12 Tf');
  content.push('0.06 0.09 0.16 rg');
  content.push('50 500 Td');
  content.push('(Report Information) Tj');
  content.push('ET');

  content.push('0.89 0.91 0.94 RG');
  content.push('0.5 w');
  content.push('50 493 m 562 493 l S');

  let y = 472;
  content.push('BT /F1 9.5 Tf 0.4 0.45 0.55 rg 50 ' + y + ' Td (Date Issued:) Tj ET');
  content.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 150 ' + y + ' Td (' + now + ') Tj ET');
  y -= 20;

  if (safeTopic) {
    content.push('BT /F1 9.5 Tf 0.4 0.45 0.55 rg 50 ' + y + ' Td (Topic:) Tj ET');
    content.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 150 ' + y + ' Td (' + safeTopic + ') Tj ET');
    y -= 20;
  }

  if (safeStaff) {
    content.push('BT /F1 9.5 Tf 0.4 0.45 0.55 rg 50 ' + y + ' Td (Reported Staff:) Tj ET');
    content.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 150 ' + y + ' Td (' + safeStaff + ') Tj ET');
    y -= 20;
  }

  content.push('BT /F1 9.5 Tf 0.4 0.45 0.55 rg 50 ' + y + ' Td (Security Status:) Tj ET');
  content.push('BT /F1 9.5 Tf 0.06 0.46 0.43 rg 150 ' + y + ' Td (Protected by End-to-End Zero-Knowledge Protocol) Tj ET');
  y -= 35;

  // Follow-up Instructions
  content.push('BT');
  content.push('/F1 12 Tf');
  content.push('0.06 0.09 0.16 rg');
  content.push('50 ' + y + ' Td');
  content.push('(How to Follow Up on This Report) Tj');
  content.push('ET');

  content.push('0.89 0.91 0.94 RG');
  content.push('0.5 w');
  content.push('50 ' + (y - 7) + ' m 562 ' + (y - 7) + ' l S');
  y -= 26;

  const instructions = [
    '1. Open the Safeguarding portal in your web browser.',
    '2. On the home page, select "Follow Up on a Message".',
    '3. Enter or paste your Secure Thread Token exactly as shown above.',
    '4. You can read administrator responses and submit additional confidential details.'
  ];

  for (const inst of instructions) {
    content.push('BT /F1 9.5 Tf 0.25 0.3 0.35 rg 50 ' + y + ' Td (' + sanitize(inst) + ') Tj ET');
    y -= 18;
  }

  // Footer divider
  content.push('0.89 0.91 0.94 RG');
  content.push('0.5 w');
  content.push('50 80 m 562 80 l S');

  content.push('BT');
  content.push('/F1 8 Tf');
  content.push('0.5 0.55 0.6 rg');
  content.push('50 65 Td');
  content.push('(Safeguarding System - Confidential - This document contains private cryptographic access data.) Tj');
  content.push('ET');

  const streamContent = content.join('\n');
  const streamLength = streamContent.length;

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj');
  objects.push('4 0 obj\n<< /Length ' + streamLength + ' >>\nstream\n' + streamContent + '\nendstream\nendobj');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj');

  let offset = 0;
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  offset += header.length;

  const xref = ['xref', '0 ' + (objects.length + 1), '0000000000 65535 f '];
  for (const obj of objects) {
    const padded = String(offset).padStart(10, '0');
    xref.push(padded + ' 00000 n ');
    offset += (obj + '\n').length;
  }

  const trailer = [
    'trailer',
    '<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>',
    'startxref',
    offset,
    '%%EOF'
  ].join('\n');

  return header + objects.join('\n') + '\n' + xref.join('\n') + '\n' + trailer;
}
