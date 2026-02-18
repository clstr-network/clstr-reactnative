import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { getCroppedImage } from "@/lib/cropImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AvatarCropModalProps {
  /** Base64 or object URL of the raw image to crop */
  image: string;
  open: boolean;
  onClose: () => void;
  /** Called with the cropped File ready for upload */
  onSave: (file: File) => void;
}

export function AvatarCropModal({ image, open, onClose, onSave }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsSaving(true);
    try {
      const croppedFile = await getCroppedImage(image, croppedAreaPixels);
      onSave(croppedFile);
    } catch (error) {
      console.error("Crop failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Crop Profile Photo</DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full aspect-square bg-black/80 border-y border-white/[0.06]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "rgba(0,0,0,0.9)" },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-6 py-4 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 text-white/40 shrink-0" />
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-white/40 shrink-0" />
        </div>

        {/* Actions */}
        <DialogFooter className="px-6 pb-6 pt-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !croppedAreaPixels}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Apply Crop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
