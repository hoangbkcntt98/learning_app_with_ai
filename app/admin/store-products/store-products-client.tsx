"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LoadingPopup } from "@/app/loading-popup";
import { ActionResultPopup } from "@/app/action-result-popup";

type StoreProduct = {
  id: number;
  productType: number;
  useType: 0 | 1;
  name: string;
  description: string;
  imageUrl: string;
  priceGold: number;
  durationDays: number;
  effectExtraAiDailyQuota: number;
  effectBonusPoints: number;
  effectBonusGold: number;
  isActive: boolean;
};

type ProductDraft = Omit<StoreProduct, "id">;

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ActionButton({
  onClick,
  tone,
  text,
  icon,
}: {
  onClick: () => void;
  tone: "view" | "edit" | "delete";
  text: string;
  icon: ReactNode;
}) {
  const toneClass =
    tone === "view"
      ? "border-blue-300 bg-blue-50 text-blue-800"
      : tone === "edit"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-rose-300 bg-rose-50 text-rose-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm ${toneClass}`}
    >
      {/* Show icon on mobile and text on larger screens. */}
      <span className="sm:hidden">{icon}</span>
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
}

function sanitizeDraft(draft: ProductDraft): ProductDraft {
  // Normalize draft values before sending to API.
  const useType = draft.useType === 1 ? 1 : 0;
  return {
    ...draft,
    useType,
    name: draft.name.trim(),
    description: draft.description.trim(),
    imageUrl: draft.imageUrl.trim(),
    durationDays: useType === 1 ? 0 : Math.max(0, Math.trunc(draft.durationDays)),
    productType: Math.max(0, Math.trunc(draft.productType)),
    priceGold: Math.max(0, Math.trunc(draft.priceGold)),
    effectExtraAiDailyQuota: Math.max(0, Math.trunc(draft.effectExtraAiDailyQuota)),
    effectBonusPoints: Math.max(0, Math.trunc(draft.effectBonusPoints)),
    effectBonusGold: Math.max(0, Math.trunc(draft.effectBonusGold)),
  };
}

export function AdminStoreProductsClient() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [newProduct, setNewProduct] = useState<ProductDraft>({
    productType: 1,
    useType: 0,
    name: "",
    description: "",
    imageUrl: "/images/products/",
    priceGold: 0,
    durationDays: 1,
    effectExtraAiDailyQuota: 0,
    effectBonusPoints: 0,
    effectBonusGold: 0,
    isActive: true,
  });
  const [selectedView, setSelectedView] = useState<StoreProduct | null>(null);
  const [selectedEdit, setSelectedEdit] = useState<StoreProduct | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const filteredProducts = useMemo(() => {
    // Filter products by name and type.
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return products.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        String(item.id).includes(normalizedSearch) ||
        String(item.productType).includes(normalizedSearch)
      );
    });
  }, [products, searchTerm]);

  useEffect(() => {
    async function loadProducts() {
      setError("");
      setLoadingMessage("Loading store products...");
      try {
        const response = await fetch("/api/admin/store-products");
        if (!response.ok) {
          setError("Failed to load store products.");
          return;
        }
        const body = (await response.json()) as { products?: StoreProduct[] };
        setProducts(body.products ?? []);
      } catch {
        setError("Failed to load store products.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadProducts();
  }, []);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Creating product...");
    try {
      const payload = sanitizeDraft(newProduct);
      const response = await fetch("/api/admin/store-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create product.");
        return;
      }
      const body = (await response.json()) as { product: StoreProduct };
      setProducts((prev) => [...prev, body.product]);
      setNewProduct({
        productType: 1,
        useType: 0,
        name: "",
        description: "",
        imageUrl: "/images/products/",
        priceGold: 0,
        durationDays: 1,
        effectExtraAiDailyQuota: 0,
        effectBonusPoints: 0,
        effectBonusGold: 0,
        isActive: true,
      });
      setStatus("Product created.");
    } catch {
      setError("Failed to create product.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveSelectedProduct() {
    if (!selectedEdit) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Saving product ${selectedEdit.id}...`);
    try {
      const payload = sanitizeDraft({
        productType: selectedEdit.productType,
        useType: selectedEdit.useType,
        name: selectedEdit.name,
        description: selectedEdit.description,
        imageUrl: selectedEdit.imageUrl,
        priceGold: selectedEdit.priceGold,
        durationDays: selectedEdit.durationDays,
        effectExtraAiDailyQuota: selectedEdit.effectExtraAiDailyQuota,
        effectBonusPoints: selectedEdit.effectBonusPoints,
        effectBonusGold: selectedEdit.effectBonusGold,
        isActive: selectedEdit.isActive,
      });
      const response = await fetch(`/api/admin/store-products/${selectedEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update product.");
        return;
      }
      const body = (await response.json()) as { product: StoreProduct };
      setProducts((prev) => prev.map((item) => (item.id === body.product.id ? body.product : item)));
      setSelectedEdit(null);
      setStatus("Product updated.");
    } catch {
      setError("Failed to update product.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function confirmDelete() {
    if (deleteId === null) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Deleting product ${deleteId}...`);
    try {
      const response = await fetch(`/api/admin/store-products/${deleteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete product.");
        return;
      }
      setProducts((prev) => prev.filter((item) => item.id !== deleteId));
      setDeleteId(null);
      setStatus("Product deleted.");
    } catch {
      setError("Failed to delete product.");
    } finally {
      setLoadingMessage("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
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

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Store management</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Back to Admin
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Create product</h2>
        <form onSubmit={createProduct} className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Product type</span>
            <input
              type="number"
              min={0}
              value={newProduct.productType}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  productType: Number.parseInt(event.target.value || "0", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Use type</span>
            <select
              value={newProduct.useType}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  useType: Number.parseInt(event.target.value || "0", 10) as 0 | 1,
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              <option value={0}>0 - Duration</option>
              <option value={1}>1 - One-time use</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Name</span>
            <input
              required
              value={newProduct.name}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-3">
            <span className="mb-1 block text-xs font-medium text-black/70">Description</span>
            <textarea
              required
              rows={2}
              value={newProduct.description}
              onChange={(event) =>
                setNewProduct((prev) => ({ ...prev, description: event.target.value }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-black/70">Image URL</span>
            <input
              required
              value={newProduct.imageUrl}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, imageUrl: event.target.value }))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={newProduct.isActive}
              onChange={(event) =>
                setNewProduct((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Active
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Price (gold)</span>
            <input
              type="number"
              min={0}
              value={newProduct.priceGold}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  priceGold: Number.parseInt(event.target.value || "0", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Duration days</span>
            <input
              type="number"
              min={0}
              value={newProduct.useType === 1 ? 0 : newProduct.durationDays}
              disabled={newProduct.useType === 1}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  durationDays: Number.parseInt(event.target.value || "0", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm disabled:bg-black/5"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Bonus AI quota</span>
            <input
              type="number"
              min={0}
              value={newProduct.effectExtraAiDailyQuota}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  effectExtraAiDailyQuota: Number.parseInt(event.target.value || "0", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Bonus points on correct</span>
            <input
              type="number"
              min={0}
              value={newProduct.effectBonusPoints}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  effectBonusPoints: Number.parseInt(event.target.value || "0", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Bonus gold on correct</span>
            <input
              type="number"
              min={0}
              value={newProduct.effectBonusGold}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  effectBonusGold: Number.parseInt(event.target.value || "0", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white md:col-span-3">
            Create product
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Products</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by ID, type, name"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">ID</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Name</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Use type</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Price</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Active</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="border-b border-black/10 px-3 py-2">{product.id}</td>
                  <td className="border-b border-black/10 px-3 py-2">{product.name}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    {product.useType === 1 ? "1 - One-time use" : "0 - Duration"}
                  </td>
                  <td className="border-b border-black/10 px-3 py-2">{product.priceGold}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    {product.isActive ? "Yes" : "No"}
                  </td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <div className="flex gap-2">
                      <ActionButton tone="view" text="View" icon={<ViewIcon />} onClick={() => setSelectedView(product)} />
                      <ActionButton tone="edit" text="Edit" icon={<EditIcon />} onClick={() => setSelectedEdit({ ...product })} />
                      <ActionButton tone="delete" text="Delete" icon={<DeleteIcon />} onClick={() => setDeleteId(product.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-black/60" colSpan={6}>
                    No products found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedView ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[320px]">
            {/* Show product details in a read-only popup. */}
            <p className="text-base font-semibold">Product detail</p>
            <Image
              src={selectedView.imageUrl}
              alt={selectedView.name}
              width={160}
              height={160}
              className="h-28 w-28 rounded-lg object-cover"
            />
            <p className="text-sm">ID: {selectedView.id}</p>
            <p className="text-sm">Name: {selectedView.name}</p>
            <p className="text-sm">Type: {selectedView.productType}</p>
            <p className="text-sm">Use type: {selectedView.useType}</p>
            <p className="text-sm">Description: {selectedView.description}</p>
            <p className="text-sm">Price: {selectedView.priceGold} gold</p>
            <p className="text-sm">Duration: {selectedView.useType === 1 ? "1 time" : `${selectedView.durationDays} day(s)`}</p>
            <p className="text-sm">Bonus AI quota: {selectedView.effectExtraAiDailyQuota}</p>
            <p className="text-sm">Bonus points: {selectedView.effectBonusPoints}</p>
            <p className="text-sm">Bonus gold: {selectedView.effectBonusGold}</p>
            <p className="text-sm">Active: {selectedView.isActive ? "Yes" : "No"}</p>
            <button
              type="button"
              onClick={() => setSelectedView(null)}
              className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {selectedEdit ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[360px]">
            {/* Edit selected product fields before saving changes. */}
            <p className="text-base font-semibold">Edit product</p>
            <input value={selectedEdit.id} disabled className="w-full rounded border border-black/10 bg-black/5 px-2 py-1 text-sm" />
            <input
              type="number"
              min={0}
              value={selectedEdit.productType}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev ? { ...prev, productType: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Product type"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <select
              value={selectedEdit.useType}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev
                    ? {
                        ...prev,
                        useType: Number.parseInt(event.target.value || "0", 10) as 0 | 1,
                        durationDays:
                          Number.parseInt(event.target.value || "0", 10) === 1 ? 0 : prev.durationDays,
                      }
                    : prev,
                )
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            >
              <option value={0}>0 - Duration</option>
              <option value={1}>1 - One-time use</option>
            </select>
            <input
              value={selectedEdit.name}
              onChange={(event) =>
                setSelectedEdit((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              placeholder="Name"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <textarea
              rows={2}
              value={selectedEdit.description}
              onChange={(event) =>
                setSelectedEdit((prev) => (prev ? { ...prev, description: event.target.value } : prev))
              }
              placeholder="Description"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              value={selectedEdit.imageUrl}
              onChange={(event) =>
                setSelectedEdit((prev) => (prev ? { ...prev, imageUrl: event.target.value } : prev))
              }
              placeholder="Image URL"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={selectedEdit.priceGold}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev ? { ...prev, priceGold: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Price gold"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              disabled={selectedEdit.useType === 1}
              value={selectedEdit.useType === 1 ? 0 : selectedEdit.durationDays}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev ? { ...prev, durationDays: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Duration days"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm disabled:bg-black/5"
            />
            <input
              type="number"
              min={0}
              value={selectedEdit.effectExtraAiDailyQuota}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev
                    ? { ...prev, effectExtraAiDailyQuota: Number.parseInt(event.target.value || "0", 10) }
                    : prev,
                )
              }
              placeholder="Bonus AI quota"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={selectedEdit.effectBonusPoints}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev ? { ...prev, effectBonusPoints: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Bonus points"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={selectedEdit.effectBonusGold}
              onChange={(event) =>
                setSelectedEdit((prev) =>
                  prev ? { ...prev, effectBonusGold: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Bonus gold"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedEdit.isActive}
                onChange={(event) =>
                  setSelectedEdit((prev) => (prev ? { ...prev, isActive: event.target.checked } : prev))
                }
              />
              Active
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={saveSelectedProduct}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSelectedEdit(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteId !== null ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[300px]">
            {/* Confirm product delete action. */}
            <p className="text-base font-semibold text-rose-700">Delete product {deleteId}?</p>
            <p className="text-sm text-black/70">This action cannot be undone.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
