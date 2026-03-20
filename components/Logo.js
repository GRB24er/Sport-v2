"use client";

export default function Logo({ height = 60, style = {} }) {
  return (
    <img
      src="/pego-logo.png"
      alt="BetGenius AI"
      height={height}
      style={{ height, width: "auto", objectFit: "contain", ...style }}
    />
  );
}
