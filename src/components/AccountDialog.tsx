import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  propositionHistoryQueryKey,
  propositionListQueryKey,
  requestSignInCode,
  sessionQueryKey,
  verifySignInCode,
} from "@/lib/voting-api";
import { VotingApiError } from "@/lib/voting";

type AccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const dialogButtonClass =
  "border-border bg-secondary/50 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-secondary";

const AccountDialog = ({ open, onOpenChange }: AccountDialogProps) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [maskedDestination, setMaskedDestination] = useState("");

  const resetState = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setDevCode(null);
    setMaskedDestination("");
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const requestCodeMutation = useMutation({
    mutationFn: requestSignInCode,
    onSuccess: (payload, variables) => {
      setStep("code");
      setCode("");
      setEmail(variables.email.trim().toLowerCase());
      setDevCode(payload.devCode ?? null);
      setMaskedDestination(payload.destination);
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: verifySignInCode,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionListQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionHistoryQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["proposition"] });
      onOpenChange(false);
    },
  });

  const requestError =
    requestCodeMutation.error instanceof VotingApiError
      ? requestCodeMutation.error.message
      : requestCodeMutation.error instanceof Error
        ? requestCodeMutation.error.message
        : "";
  const verifyError =
    verifyCodeMutation.error instanceof VotingApiError
      ? verifyCodeMutation.error.message
      : verifyCodeMutation.error instanceof Error
        ? verifyCodeMutation.error.message
        : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background text-foreground sm:max-w-md">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="font-mono text-base uppercase tracking-[0.18em]">
            University account
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Sign in with your university email. Each account maps to one campus identity, and each proposal still allows only one recorded vote.
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              requestCodeMutation.mutate({ email });
            }}
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground" htmlFor="university-email">
                University email
              </label>
              <Input
                id="university-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@university.edu"
                className="border-border bg-secondary/30 font-mono text-sm"
              />
            </div>
            {requestError ? <p className="text-xs text-red-500">{requestError}</p> : null}
            <Button
              type="submit"
              disabled={requestCodeMutation.isPending || email.trim().length === 0}
              variant="outline"
              className={dialogButtonClass}
            >
              {requestCodeMutation.isPending ? "Sending code" : "Send code"}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              verifyCodeMutation.mutate({ email, code });
            }}
          >
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Verification code</p>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="text-foreground">{maskedDestination}</span>.
              </p>
            </div>
            <InputOTP
              value={code}
              onChange={setCode}
              maxLength={6}
              containerClassName="justify-start"
              className="font-mono"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="border-border bg-secondary/30 text-foreground"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {devCode ? (
              <div className="rounded border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                Local development code: <span className="text-foreground">{devCode}</span>
              </div>
            ) : null}
            {verifyError ? <p className="text-xs text-red-500">{verifyError}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="justify-start px-0 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setDevCode(null);
                }}
              >
                Change email
              </Button>
              <Button type="submit" disabled={verifyCodeMutation.isPending || code.length !== 6} variant="outline" className={dialogButtonClass}>
                {verifyCodeMutation.isPending ? "Verifying" : "Confirm sign in"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
