import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  purpose?: "deposit" | "order";
  orderId?: number;
  onSuccess?: () => void;
}

export function CryptoPaymentModal({ open, onOpenChange, total, purpose = "deposit", orderId, onSuccess }: CryptoPaymentModalProps) {
  const { toast } = useToast();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [triggered, setTriggered] = useState(false);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/crypto/create", {
        amount: String(total),
        purpose,
        orderId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        if (data.paymentId) {
          sessionStorage.setItem("lastCryptoPaymentId", data.paymentId);
          sessionStorage.setItem("lastCryptoPurpose", purpose);
        }
        if (onSuccess) onSuccess();
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open && !triggered && total > 0) {
      setTriggered(true);
      createPaymentMutation.mutate();
    }
    if (!open) {
      setTriggered(false);
      setCheckoutUrl(null);
    }
  }, [open]);

  const handleClose = () => {
    setCheckoutUrl(null);
    setTriggered(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center justify-between">
            <span>Crypto Payment</span>
            <span className="bg-primary text-primary-foreground font-bold px-3 py-1 rounded text-sm">
              ${(total / 100).toFixed(2)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {createPaymentMutation.isPending ? (
            <div className="text-center space-y-3 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="font-medium text-foreground">Creating Payment...</p>
              <p className="text-sm text-muted-foreground">
                Opening checkout page in a new tab...
              </p>
            </div>
          ) : checkoutUrl ? (
            <>
              <div className="text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                  <ExternalLink className="h-8 w-8 text-red-500" />
                </div>
                <p className="font-medium text-foreground">Payment Window Opened</p>
                <p className="text-sm text-muted-foreground">
                  {purpose === "order"
                    ? "Complete your payment in the new tab. You will receive your item once confirmed."
                    : "Complete your payment in the new tab. Your balance will be credited once confirmed."}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => window.open(checkoutUrl, "_blank")}
                className="w-full"
                data-testid="button-reopen-checkout"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Reopen Payment Page
              </Button>

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-muted-foreground"
                data-testid="button-close-after-payment"
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {createPaymentMutation.isError 
                  ? "Payment creation failed. Try again." 
                  : "Preparing payment..."}
              </p>
              {createPaymentMutation.isError && (
                <Button
                  onClick={() => createPaymentMutation.mutate()}
                  className="w-full"
                  data-testid="button-retry-crypto"
                >
                  Retry Payment
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
