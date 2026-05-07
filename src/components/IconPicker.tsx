import * as React from "react";
import { 
  Scissors, 
  Sparkles, 
  Palette, 
  Crown, 
  Heart, 
  Star, 
  Zap, 
  Sun,
  Moon,
  Cloud,
  Wind,
  Droplets,
  Flame,
  Snowflake,
  Leaf,
  Flower,
  TreePine,
  Mountain,
  Waves,
  Umbrella,
  GlassWater,
  Coffee,
  Cake,
  IceCream,
  Cookie,
  Pizza,
  Sandwich,
  Soup,
  Salad,
  Beef,
  Fish,
  Egg,
  Milk,
  Wine,
  Beer,
  Glasses,
  Watch,
  Gem,
  Diamond,
  CircleDot,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Music,
  Camera,
  Video,
  Image,
  Paintbrush,
  Pencil,
  Pen,
  Brush,
  Eraser,
  Ruler,
  Wrench,
  Hammer,
  Drill,
  Axe,
  Shovel,
  Pickaxe,
  Sword,
  Shield,
  Anchor,
  Compass,
  Map,
  Navigation,
  Target,
  Crosshair,
  Focus,
  Eye,
  EyeOff,
  Shirt,
  Footprints,
  Hand,
  Handshake,
  ThumbsUp,
  ThumbsDown,
  type LucideIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const availableIcons: { name: string; icon: LucideIcon }[] = [
  { name: "Scissors", icon: Scissors },
  { name: "Sparkles", icon: Sparkles },
  { name: "Palette", icon: Palette },
  { name: "Crown", icon: Crown },
  { name: "Heart", icon: Heart },
  { name: "Star", icon: Star },
  { name: "Zap", icon: Zap },
  { name: "Sun", icon: Sun },
  { name: "Moon", icon: Moon },
  { name: "Cloud", icon: Cloud },
  { name: "Wind", icon: Wind },
  { name: "Droplets", icon: Droplets },
  { name: "Flame", icon: Flame },
  { name: "Snowflake", icon: Snowflake },
  { name: "Leaf", icon: Leaf },
  { name: "Flower", icon: Flower },
  { name: "TreePine", icon: TreePine },
  { name: "Mountain", icon: Mountain },
  { name: "Waves", icon: Waves },
  { name: "Umbrella", icon: Umbrella },
  { name: "GlassWater", icon: GlassWater },
  { name: "Coffee", icon: Coffee },
  { name: "Cake", icon: Cake },
  { name: "IceCream", icon: IceCream },
  { name: "Cookie", icon: Cookie },
  { name: "Pizza", icon: Pizza },
  { name: "Sandwich", icon: Sandwich },
  { name: "Soup", icon: Soup },
  { name: "Salad", icon: Salad },
  { name: "Beef", icon: Beef },
  { name: "Fish", icon: Fish },
  { name: "Egg", icon: Egg },
  { name: "Milk", icon: Milk },
  { name: "Wine", icon: Wine },
  { name: "Beer", icon: Beer },
  { name: "Glasses", icon: Glasses },
  { name: "Watch", icon: Watch },
  { name: "Gem", icon: Gem },
  { name: "Diamond", icon: Diamond },
  { name: "CircleDot", icon: CircleDot },
  { name: "Square", icon: Square },
  { name: "Triangle", icon: Triangle },
  { name: "Hexagon", icon: Hexagon },
  { name: "Octagon", icon: Octagon },
  { name: "Music", icon: Music },
  { name: "Camera", icon: Camera },
  { name: "Video", icon: Video },
  { name: "Image", icon: Image },
  { name: "Paintbrush", icon: Paintbrush },
  { name: "Pencil", icon: Pencil },
  { name: "Pen", icon: Pen },
  { name: "Brush", icon: Brush },
  { name: "Eraser", icon: Eraser },
  { name: "Ruler", icon: Ruler },
  { name: "Wrench", icon: Wrench },
  { name: "Hammer", icon: Hammer },
  { name: "Drill", icon: Drill },
  { name: "Axe", icon: Axe },
  { name: "Axe", icon: Axe },
  { name: "Shovel", icon: Shovel },
  { name: "Pickaxe", icon: Pickaxe },
  { name: "Sword", icon: Sword },
  { name: "Shield", icon: Shield },
  { name: "Anchor", icon: Anchor },
  { name: "Compass", icon: Compass },
  { name: "Map", icon: Map },
  { name: "Navigation", icon: Navigation },
  { name: "Target", icon: Target },
  { name: "Crosshair", icon: Crosshair },
  { name: "Focus", icon: Focus },
  { name: "Eye", icon: Eye },
  { name: "EyeOff", icon: EyeOff },
  { name: "Shirt", icon: Shirt },
  { name: "Footprints", icon: Footprints },
  { name: "Hand", icon: Hand },
  { name: "Handshake", icon: Handshake },
  { name: "ThumbsUp", icon: ThumbsUp },
  { name: "ThumbsDown", icon: ThumbsDown },
];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedIcon = availableIcons.find((i) => i.name === value)?.icon || Palette;
  const filteredIcons = search
    ? availableIcons.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
      )
    : availableIcons;

  const SelectedIcon = selectedIcon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <SelectedIcon className="h-4 w-4 text-white" />
          </div>
          <span className="flex-1 text-left">{value || "Select icon"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="p-3 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-6 gap-2">
            {filteredIcons.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors hover:bg-gray-100",
                  value === name && "bg-blue-50 ring-2 ring-blue-500"
                )}
                title={name}
              >
                <Icon className="h-5 w-5 text-gray-700" />
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to get icon component by name
export function getIconByName(name: string): LucideIcon {
  return availableIcons.find((i) => i.name === name)?.icon || Palette;
}
