import { PACKAGES } from "./constants";

// Convert Mongoose Map to plain object (used across all API routes)
export function mToObj(m) {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m.toJSON === "function") return m.toJSON();
  return typeof m === "object" ? { ...m } : {};
}

// Generate referral code
export function generateReferralCode(identifier) {
  const suffix = identifier.slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BG-${suffix}-${random}`;
}

// Generate Betting ID
export function generateBettingId(identifier) {
  return `BG-${identifier}`;
}

// Time ago formatter
export function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// Validate phone number (international E.164 format)
export function validatePhone(phone) {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

// Get package by ID
export function getPackageById(packageId) {
  return PACKAGES.find((p) => p.id === packageId);
}

// Sanitize user for client (remove password)
export function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}
