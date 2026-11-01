export function canSendInvitation(invite: { org_id: string; accepted_at: string | null; expires_at: string | null; role: string }, canManage: boolean, now = Date.now()) {
  return canManage && !invite.accepted_at && !!invite.expires_at && Date.parse(invite.expires_at) > now && ["member", "admin"].includes(invite.role);
}

export function escapeHtml(value: string) {
  const chars: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (char) => chars[char] || char);
}