import { Button } from "@betterbill/ui/components/button";
import { Label } from "@betterbill/ui/components/label";
import { Textarea } from "@betterbill/ui/components/textarea";
import { cn } from "@betterbill/ui/lib/utils";
import { Camera, ClipboardPaste, Images } from "lucide-react";
import { useRef, useState } from "react";

type UploadPanelProps = {
  onPhotos: (files: File[]) => void;
  onText: (text: string) => void;
  onSample: () => void;
  busy?: boolean;
  error?: string | null;
  className?: string;
};

const ICON = { className: "size-5", strokeWidth: 1.75, "aria-hidden": true };

export function UploadPanel({
  onPhotos,
  onText,
  onSample,
  busy,
  error,
  className,
}: UploadPanelProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");

  function handleFiles(input: HTMLInputElement | null) {
    const files = Array.from(input?.files ?? []);
    if (input) input.value = "";
    if (files.length > 0) onPhotos(files);
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border bg-card p-5 shadow-card",
        className,
      )}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive bg-coral-soft p-3 text-coral-ink text-sm leading-5"
        >
          {error}
        </div>
      ) : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => handleFiles(cameraRef.current)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => handleFiles(galleryRef.current)}
      />

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
      >
        <Camera {...ICON} />
        Take a photo
      </Button>
      <p className="text-muted-foreground text-xs leading-4">
        Lay the bill flat in good light. One photo per page.
      </p>

      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => galleryRef.current?.click()}
      >
        <Images {...ICON} />
        Choose from photos
      </Button>

      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        aria-expanded={pasting}
        onClick={() => setPasting((v) => !v)}
      >
        <ClipboardPaste {...ICON} />
        Paste the text
      </Button>

      {pasting ? (
        <div className="space-y-3">
          <Label htmlFor="bill-text">Bill text</Label>
          <Textarea
            id="bill-text"
            className="min-h-40"
            placeholder="Paste the text from your bill or patient portal"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            className="w-full"
            disabled={busy || text.trim().length === 0}
            onClick={() => onText(text)}
          >
            Check my bill
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="ghost"
        className="w-full"
        disabled={busy}
        onClick={onSample}
      >
        Try a sample bill
      </Button>
      <p className="text-center text-muted-foreground text-xs leading-4">
        A synthetic $12,000 hospital bill with known errors.
      </p>
    </div>
  );
}
