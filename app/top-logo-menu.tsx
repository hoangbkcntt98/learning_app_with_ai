"use client";

import Image from "next/image";
import Link from "next/link";

export function TopLogoMenu() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2"
      aria-label="Go to homepage"
    >
      <Image
        src="/images/logo.png"
        alt="BuBu Learning logo"
        width={40}
        height={40}
        className="h-10 w-10 rounded-lg object-cover"
        priority
      />
      <span className="text-sm font-semibold">BuBu Learning</span>
    </Link>
  );
}
