import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed = false }: OrgSwitcherProps) {
  const { user } = useAuth();
  
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors",
      collapsed && "justify-center"
    )}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={user?.user_metadata?.avatar_url} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-sidebar-foreground truncate">
            {displayName}
          </span>
          <span className="text-xs text-sidebar-foreground/60 truncate">
            {user?.email}
          </span>
        </div>
      )}
    </div>
  );
}
