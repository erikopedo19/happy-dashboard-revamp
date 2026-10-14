export function canSendInvitation(invite: { org_id: string; status: string; expires_at: string | null; role: string }, userId: string, now = Date.now()) {
  return invite.org_id === userId && invite.status === "pending" && !!invite.expires_at && Date.parse(invite.expires_at) > now && ["member", "admin"].includes(invite.role);
}

export function escapeHtml(value: string) {
  const chars: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (char) => chars[char] || char);
}