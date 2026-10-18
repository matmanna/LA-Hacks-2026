import { Button } from "@betterbill/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

// B2: creates (or reuses) the read-only evidence packet link and opens it.
export function SharePacketButton({
  caseId,
  className,
}: {
  caseId: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const share = useMutation(
    orpc.case.share.mutationOptions({
      onSuccess: ({ token }) =>
        navigate({ to: "/packet/$token", params: { token } }),
      onError: (e) => toast.error(e.message),
    }),
  );
  return (
    <Button
      variant="secondary"
      className={className}
      disabled={share.isPending}
      onClick={() => share.mutate({ caseId })}
    >
      <FileText aria-hidden="true" />
      {share.isPending ? "Preparing..." : "Evidence packet"}
    </Button>
  );
}
