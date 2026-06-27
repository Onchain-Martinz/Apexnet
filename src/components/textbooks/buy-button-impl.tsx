"use client";

import { useEffect, useState } from "react";
import { useFlutterwave, closePaymentModal, FlutterWaveTypes } from "flutterwave-react-v3";
import { routes } from "@/config/routes";
import { Button } from "@/components/ui/button";

// ── Buy Now button (actual implementation) ──────────────────────────────────
// Calls /api/purchases/initialize to create a PENDING purchase row, then opens
// the Flutterwave Inline SDK modal scoped to whichever method the student
// picked (Bank Transfer primary, Card secondary — see PaymentMethod below).
// Flutterwave's own payment_options has no documented "default selected
// method" — the only lever it exposes is which methods are included at all
// — so each button opens the modal restricted to just its own method instead
// of one shared list with everything available.
// Flutterwave handles all credential collection — Apex never sees card/bank data.
// On success, browser redirects to the purchase callback page for verification.
//
// Loaded lazily, client-only, via buy-button.tsx (next/dynamic, ssr: false) —
// see that file for why. Do not import this file directly; import BuyButton
// from "./buy-button" instead.

type PaymentMethod = "banktransfer" | "card";

interface CheckoutData {
  txRef: string;
  amount: number;
  email: string;
  method: PaymentMethod;
}

const APP_LOGO = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/logo.png`;

export function BuyButton({ textbookId }: { textbookId: string }) {
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  const handleFlutterwavePayment = useFlutterwave({
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? "",
    tx_ref: checkoutData?.txRef ?? "pending",
    amount: checkoutData?.amount ?? 0,
    currency: "NGN",
    payment_options: checkoutData?.method ?? "banktransfer",
    customer: {
      email: checkoutData?.email ?? "",
      phone_number: "",
      name: "",
    },
    customizations: {
      title: "Apex",
      description: "Textbook purchase",
      logo: APP_LOGO,
    },
  });

  // Opens the modal once checkoutData is ready (set after the API call succeeds).
  useEffect(() => {
    if (!checkoutData) return;

    handleFlutterwavePayment({
      callback: (response: FlutterWaveTypes.FlutterWaveResponse) => {
        closePaymentModal();
        if (response.status === "successful" || response.status === "completed") {
          window.location.href =
            `${routes.student.purchaseCallback}` +
            `?tx_ref=${encodeURIComponent(response.tx_ref)}` +
            `&transaction_id=${response.transaction_id}` +
            `&status=${response.status}`;
        } else {
          setError("Payment was not completed. Please try again.");
          setLoadingMethod(null);
          setCheckoutData(null);
        }
      },
      onClose: () => {
        setLoadingMethod(null);
        setCheckoutData(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutData]);

  async function startCheckout(method: PaymentMethod) {
    setLoadingMethod(method);
    setError(null);

    try {
      const res = await fetch(routes.api.purchases.initialize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textbookId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoadingMethod(null);
        return;
      }

      setCheckoutData({ txRef: data.txRef, amount: data.amount, email: data.email, method });
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoadingMethod(null);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => startCheckout("banktransfer")}
        disabled={loadingMethod !== null}
        className="flex h-14 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97] disabled:opacity-60"
      >
        {loadingMethod === "banktransfer" ? "Opening checkout…" : "Pay with Bank Transfer"}
      </button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => startCheckout("card")}
        loading={loadingMethod === "card"}
        disabled={loadingMethod !== null}
      >
        Pay with Card
      </Button>

      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
