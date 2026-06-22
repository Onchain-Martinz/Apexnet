"use client";

import { useEffect, useState } from "react";
import { useFlutterwave, closePaymentModal, FlutterWaveTypes } from "flutterwave-react-v3";
import { routes } from "@/config/routes";

// ── Buy Now button ───────────────────────────────────────────────────────────
// Calls /api/purchases/initialize to create a PENDING purchase row, then opens
// the Flutterwave Inline SDK modal (card, bank transfer, USSD, account).
// Flutterwave handles all credential collection — Apex never sees card/bank data.
// On success, browser redirects to the purchase callback page for verification.

interface CheckoutData {
  txRef: string;
  amount: number;
  email: string;
}

const APP_LOGO = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/logo.png`;

export function BuyButton({ textbookId }: { textbookId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  const handleFlutterwavePayment = useFlutterwave({
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? "",
    tx_ref: checkoutData?.txRef ?? "pending",
    amount: checkoutData?.amount ?? 0,
    currency: "NGN",
    payment_options: "card, account, ussd, banktransfer",
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
          setLoading(false);
          setCheckoutData(null);
        }
      },
      onClose: () => {
        setLoading(false);
        setCheckoutData(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutData]);

  async function handleClick() {
    setLoading(true);
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
        setLoading(false);
        return;
      }

      setCheckoutData({ txRef: data.txRef, amount: data.amount, email: data.email });
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97] disabled:opacity-60"
      >
        {loading ? "Opening checkout…" : "Buy Now"}
      </button>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
