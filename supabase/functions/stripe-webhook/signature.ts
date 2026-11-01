export async function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()): Promise<boolean> {
  const parts = header.split(',').map(p => p.trim().split('='));
  const t = parts.find(([key]) => key === 't')?.[1];
  if (!t || !/^\d+$/.test(t) || Math.abs(now / 1000 - Number(t)) > 300) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${t}.${payload}`)));
  const expected = Array.from(signed).map(b => b.toString(16).padStart(2, '0')).join('');
  return parts.filter(([key]) => key === 'v1').some(([,signature]) => {
    if (!signature || signature.length !== expected.length) return false;
    let diff = 0;
    for (let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i)^signature.charCodeAt(i);
    return diff === 0;
  });
}
