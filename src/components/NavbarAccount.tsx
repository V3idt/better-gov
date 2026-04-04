import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AccountDialog from "@/components/AccountDialog";
import { Button } from "@/components/ui/button";
import {
  getSession,
  propositionHistoryQueryKey,
  propositionListQueryKey,
  sessionQueryKey,
  signOut,
} from "@/lib/voting-api";

const roleLabel = (role: "student" | "staff" | "dual") => {
  if (role === "dual") return "student / staff";
  return role;
};

const actionButtonClass =
  "border-border bg-secondary/30 font-mono text-xs uppercase tracking-[0.16em] text-foreground hover:bg-secondary";

const NavbarAccount = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionListQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionHistoryQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["proposition"] });
    },
  });

  if (sessionQuery.data?.authenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-xs uppercase tracking-[0.16em] text-foreground">{sessionQuery.data.person.displayName}</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {roleLabel(sessionQuery.data.person.primaryRole)}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={signOutMutation.isPending}
          className={actionButtonClass}
          onClick={() => signOutMutation.mutate()}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" className={actionButtonClass} onClick={() => setDialogOpen(true)}>
        Sign in
      </Button>
      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

export default NavbarAccount;
