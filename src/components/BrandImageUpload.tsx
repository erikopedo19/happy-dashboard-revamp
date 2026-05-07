
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type BrandImageUploadProps = {
  label: string;
  path: string | null;
  onChange: (url: string) => void;
  folder: string; // e.g., "banner" or "logo"
  className?: string;
  helperText?: string;
  circle?: boolean;
};

export function BrandImageUpload({
  label,
  path,
  onChange,
  folder,
  className,
  helperText,
  circle,
}: BrandImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(path);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("brand-images")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;
      const { data: { publicUrl } } = supabase
        .storage
        .from("brand-images")
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onChange(publicUrl);
    } catch (e) {
      // handled in parent
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className || ""}>
      {label && <div className="text-sm font-semibold mb-1">{label}</div>}
      <div className={`flex items-center justify-center ${circle ? "rounded-full overflow-hidden w-20 h-20 border bg-gray-100" : "rounded-lg h-32 border bg-gray-100"} mb-2`}>
        {preview ? (
          <img
            src={preview}
            alt={label}
            className={`object-cover ${circle ? "w-20 h-20 rounded-full" : "w-full h-32 rounded-lg"}`}
          />
        ) : (
          <Upload className="text-gray-400" size={circle ? 30 : 36} />
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Button
        variant="outline"
        className={`rounded-full px-6 flex items-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
        <span>{uploading ? "Uploading..." : label}</span>
      </Button>
      {helperText && <div className="text-xs text-gray-500 mt-1">{helperText}</div>}
    </div>
  );
}
