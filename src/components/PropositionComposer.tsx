import { Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AccountDialog from "@/components/AccountDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { VotingApiError } from "@/lib/voting";
import {
  createProposition,
  getSession,
  propositionHistoryQueryKey,
  propositionListQueryKey,
  sessionQueryKey,
} from "@/lib/voting-api";

const triggerButtonClass =
  "fixed bottom-6 right-6 z-40 border-border bg-background/95 font-mono text-xs uppercase tracking-[0.16em] text-foreground shadow-lg backdrop-blur hover:bg-secondary";

const actionButtonClass =
  "border-border bg-secondary/50 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-secondary";

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateTimeInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const defaultClosesAtValue = () => {
  const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toDateTimeInputValue(date);
};

type PropositionFormState = {
  title: string;
  category: string;
  scope: string;
  tldr: string;
  bullets: string;
  brief: string;
  closesAt: string;
};

const createDefaultFormState = (): PropositionFormState => ({
  title: "",
  category: "",
  scope: "University-wide",
  tldr: "",
  bullets: "",
  brief: "",
  closesAt: defaultClosesAtValue(),
});

const PropositionComposer = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [form, setForm] = useState<PropositionFormState>(() => createDefaultFormState());

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProposition({
        title: form.title,
        category: form.category,
        scope: form.scope,
        tldr: form.tldr,
        bullets: form.bullets
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        brief: form.brief,
        closesAt: Number.isNaN(Date.parse(form.closesAt)) ? form.closesAt : new Date(form.closesAt).toISOString(),
      }),
    onSuccess: async (payload) => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: propositionListQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionHistoryQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["proposition"] });
      toast.success("Proposition posted as draft.");
      navigate(payload.proposition.path);
    },
  });

  const errorMessage =
    createMutation.error instanceof VotingApiError
      ? createMutation.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : "";

  const handleOpen = () => {
    if (sessionQuery.data?.authenticated) {
      setOpen(true);
      return;
    }

    setAccountDialogOpen(true);
  };

  const handleComposerOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setForm(createDefaultFormState());
      createMutation.reset();
    }
  };

  return (
    <>
      <Button type="button" variant="outline" className={triggerButtonClass} onClick={handleOpen}>
        <Plus className="h-4 w-4" />
        Post proposition
      </Button>

      <AccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} />

      <Dialog open={open} onOpenChange={handleComposerOpenChange}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground sm:max-h-[min(88vh,820px)] sm:max-w-2xl">
          <DialogHeader className="space-y-3 border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle className="font-mono text-base uppercase tracking-[0.18em]">Post proposition</DialogTitle>
            <DialogDescription className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              New submissions start as draft. They show up in the draft view immediately, but they do not open for voting until a review workflow exists.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proposition-title" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Title
                  </Label>
                  <Input
                    id="proposition-title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    maxLength={120}
                    placeholder="Keep the library open later during exams"
                    className="border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposition-category" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Category
                  </Label>
                  <Input
                    id="proposition-category"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    maxLength={48}
                    placeholder="Student life"
                    className="border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposition-scope" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Scope
                  </Label>
                  <Input
                    id="proposition-scope"
                    value={form.scope}
                    onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}
                    maxLength={80}
                    placeholder="University-wide"
                    className="border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proposition-tldr" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    tl;dr
                  </Label>
                  <Textarea
                    id="proposition-tldr"
                    value={form.tldr}
                    onChange={(event) => setForm((current) => ({ ...current, tldr: event.target.value }))}
                    maxLength={280}
                    placeholder="One short sentence that explains the decision plainly."
                    className="min-h-[84px] border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proposition-bullets" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Key points
                  </Label>
                  <Textarea
                    id="proposition-bullets"
                    value={form.bullets}
                    onChange={(event) => setForm((current) => ({ ...current, bullets: event.target.value }))}
                    placeholder={"One point per line\nLate access reduces crowding\nCommuter students keep usable study hours"}
                    className="min-h-[110px] border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proposition-brief" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Full brief
                  </Label>
                  <Textarea
                    id="proposition-brief"
                    value={form.brief}
                    onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
                    maxLength={8000}
                    placeholder="Explain the issue, what should change, and why it matters."
                    className="min-h-[160px] border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proposition-closes-at" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Closing time
                  </Label>
                  <Input
                    id="proposition-closes-at"
                    type="datetime-local"
                    value={form.closesAt}
                    onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
                    className="border-border bg-secondary/30 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 border-t border-border px-6 py-4 sm:justify-between sm:space-x-0">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {errorMessage ? (
                  <span className="text-red-500">{errorMessage}</span>
                ) : (
                  "Posting is tied to your signed-in university account and limited to slow abuse."
                )}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" className={actionButtonClass} onClick={() => handleComposerOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="outline" disabled={createMutation.isPending} className={actionButtonClass}>
                  {createMutation.isPending ? "Posting" : "Post draft"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropositionComposer;
