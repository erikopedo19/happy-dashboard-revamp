
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  maxSizeMB?: number;
};

export function BrandImageUpload({
  label,
  path,
  onChange,
  folder,
  className,
  helperText,
  circle,
  maxSizeMB = 2,
}: BrandImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(path);

  useEffect(() => {
    setPreview(path);
  }, [path]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: `Please upload an image under ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error("You must be signed in to upload images.");
      const fileName = `${uid}/${folder}_${Date.now()}.${fileExt}`;
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
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className || ""}>
      {label && <div className="text-sm font-semibold mb-1 text-[#1C1C1E] dark:text-[#F2F2F7]">{label}</div>}
      <div className={`flex items-center justify-center border border-gray-300 dark:border-[#3A3A3C] bg-gray-100 dark:bg-[#2C2C2E] mb-2 ${circle ? "rounded-full overflow-hidden w-20 h-20" : "rounded-lg h-32 w-full"}`}>
        {preview ? (
          <img
            src={preview}
            alt={label}
            onError={() => setPreview(null)}
            className={`object-cover ${circle ? "w-20 h-20 rounded-full" : "w-full h-32 rounded-lg"}`}
          />
        ) : (
          <Upload className="text-gray-400 dark:text-gray-500" size={circle ? 30 : 36} />
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
        <span>{uploading ? "Uploading..." : preview ? "Change" : "Upload"}</span>
      </Button>
      {helperText && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helperText}</div>}
    </div>
  );
}
