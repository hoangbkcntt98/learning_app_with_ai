"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ActionResultPopup } from "@/app/action-result-popup";
import { LoadingPopup } from "@/app/loading-popup";

type StoreProduct = {
  id: number;
  productType: number;
  useType: 0 | 1;
  name: string;
  description: string;
  imageUrl: string;
  priceGold: number;
  stockLimit: number | null;
  soldCount: number;
  durationDays: number;
};

export function StoreClient({ initialGold }: { initialGold: number }) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<number[]>([]);
  const [gold, setGold] = useState(initialGold);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [descriptionProduct, setDescriptionProduct] = useState<StoreProduct | null>(null);
  const [buyingProductId, setBuyingProductId] = useState<number | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.priceGold - b.priceGold || a.id - b.id),
    [products],
  );

  useEffect(() => {
    async function loadStore() {
      // Load store products and user's current gold balance.
      setLoadingMessage("Loading store...");
      setError("");
      try {
        const response = await fetch("/api/store/products", { cache: "no-store" });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Failed to load store.");
          return;
        }
        const body = (await response.json()) as {
          products?: StoreProduct[];
          userGold?: number;
          ownedProductIds?: number[];
        };
        setProducts(body.products ?? []);
        setGold(typeof body.userGold === "number" ? body.userGold : initialGold);
        setOwnedProductIds(body.ownedProductIds ?? []);
      } catch {
        setError("Failed to load store.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadStore();
  }, [initialGold]);

  async function buyProduct(product: StoreProduct) {
    // Purchase one product and update local gold when successful.
    setError("");
    setStatus("");
    setBuyingProductId(product.id);
    try {
      const response = await fetch("/api/store/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to buy product.");
        return;
      }
      const body = (await response.json()) as { userGold?: number };
      setGold(typeof body.userGold === "number" ? body.userGold : gold);
      setOwnedProductIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]));
      setStatus(`Purchased ${product.name} successfully.`);
      window.dispatchEvent(new Event("store:updated"));
    } catch {
      setError("Failed to buy product.");
    } finally {
      setBuyingProductId(null);
    }
  }

  return (
    <section className="mt-6">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}
      <ActionResultPopup
        isOpen={Boolean(error || status)}
        message={error || status}
        tone={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setStatus("");
        }}
      />

      <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-black/[0.03] px-3 py-1.5 text-sm">
        <span className="font-medium">Your gold:</span>
        <span className="font-semibold">{gold}</span>
        <Image
          src="/images/gold.jpg"
          alt="Gold"
          width={16}
          height={16}
          className="rounded-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sortedProducts.map((product) => {
          const isOwned = ownedProductIds.includes(product.id);
          const remainingStock =
            product.stockLimit === null ? null : Math.max(0, product.stockLimit - product.soldCount);
          const isOutOfStock = remainingStock !== null && remainingStock <= 0;
          return (
          <article
            key={product.id}
            className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
          >
            <div className="relative aspect-square w-full">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm font-semibold text-white">
                {product.name}
              </div>
            </div>
            <div className="p-3">
              <p className="inline-flex items-center gap-1 text-sm font-medium text-black/80">
                Price: {product.priceGold}
                <Image
                  src="/images/gold.jpg"
                  alt="Gold"
                  width={14}
                  height={14}
                  className="rounded-full object-cover"
                />
              </p>
              <p className="mt-1 text-xs text-black/60">
                Expiration: {product.useType === 1 ? "1 time" : `${product.durationDays} day(s)`}
              </p>
              <p className="mt-1 text-xs text-black/60">
                Stock: {remainingStock === null ? "Unlimited" : `${remainingStock} left`}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDescriptionProduct(product)}
                  className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium"
                >
                  Description
                </button>
                <button
                  type="button"
                  onClick={() => buyProduct(product)}
                  disabled={
                    isOwned || isOutOfStock || buyingProductId === product.id || gold < product.priceGold
                  }
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-black text-white shadow-[0_3px_0_#065f46] transition active:translate-y-[1px] active:shadow-[0_2px_0_#065f46] disabled:opacity-50"
                >
                  {isOwned
                    ? "Owned"
                    : isOutOfStock
                      ? "Out of stock"
                      : buyingProductId === product.id
                        ? "Buying..."
                        : "Buy"}
                </button>
              </div>
            </div>
          </article>
          );
        })}
      </div>

      {descriptionProduct ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[300px]">
            {/* Show selected store item description in a reusable popup style. */}
            <p className="text-base font-semibold">{descriptionProduct.name}</p>
            <p className="text-sm text-black/70">{descriptionProduct.description}</p>
            <p className="text-xs text-black/55">Type: {descriptionProduct.productType}</p>
            <button
              type="button"
              onClick={() => setDescriptionProduct(null)}
              className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
