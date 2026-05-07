
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
}

export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureMembership = async (orgId: string) => {
    if (!user) return;
    const { data: existing } = await (supabase
      .from("memberships" as any)
      .select("id") as any)
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      await (supabase.from("memberships" as any) as any).insert({
        org_id: orgId,
        user_id: user.id,
        role: "owner",
      });
    }
  };

  const createDefaultOrg = async () => {
    if (!user) return null;
    const baseSlug = `org-${user.id.slice(0, 8)}`;
    const slug = `${baseSlug}-${Date.now()}`;
    const { data, error } = await ((supabase as any)
      .from("organizations")
      .insert({
        name: "My Barbershop",
        slug,
        created_by: user.id,
      })
      .select("*")
      .single());

    if (error) {
      console.error("Error creating organization:", error);
      return null;
    }

    await ensureMembership(data.id);

    return data as Organization;
  };

  useEffect(() => {
    async function loadOrg() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First try to find an organization owned by the user
        // Cast to any to avoid type errors if types aren't generated yet
        const { data: ownedOrgs, error: orgError } = await ((supabase as any)
          .from("organizations")
          .select("*")
          .eq("created_by", user.id)
          .maybeSingle());

        if (ownedOrgs) {
          setOrganization(ownedOrgs);
          setMembership({
            id: 'owner', // virtual id
            org_id: ownedOrgs.id,
            user_id: user.id,
            role: 'owner'
          });
          await ensureMembership(ownedOrgs.id);
        } else {
          // If not owner, check memberships
          const { data: memberships } = await ((supabase as any)
            .from("memberships")
            .select("*, organization:organizations(*)")
            .eq("user_id", user.id)
            .maybeSingle());

          if (memberships && memberships.organization) {
            setOrganization(memberships.organization);
            setMembership({
              id: memberships.id,
              org_id: memberships.org_id,
              user_id: memberships.user_id,
              role: memberships.role
            });
          } else {
            const newOrg = await createDefaultOrg();
            if (newOrg) {
              setOrganization(newOrg);
              setMembership({
                id: 'owner',
                org_id: newOrg.id,
                user_id: user.id,
                role: 'owner',
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading organization:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrg();
  }, [user]);

  return {
    organization,
    membership,
    loading,
    isOwner: membership?.role === 'owner',
    isAdmin: membership?.role === 'owner' || membership?.role === 'admin'
  };
}
