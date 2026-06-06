import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUSDC(raw: bigint, decimals = 2): string {
  const n = Number(raw) / 1e18;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatBps(bps: bigint): string {
  return (Number(bps) / 100).toFixed(2);
}

export function formatUtilization(raw: bigint): string {
  // raw is utilization * 1e18
  return ((Number(raw) / 1e18) * 100).toFixed(1);
}

export function durationLabel(seconds: number): string {
  if (seconds === 30 * 86400) return "30 days";
  if (seconds === 60 * 86400) return "60 days";
  if (seconds === 90 * 86400) return "90 days";
  return `${Math.round(seconds / 86400)} days`;
}

export function timeLeft(dueDate: bigint): string {
  const now  = Math.floor(Date.now() / 1000);
  const diff = Number(dueDate) - now;
  if (diff <= 0) return "Overdue";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}m left`;
}

export function scoreLabel(score: bigint): { tier: string; color: string } {
  const s = Number(score);
  if (s < 100)  return { tier: "Unrated",   color: "#7090b0" };
  if (s < 300)  return { tier: "Starter",   color: "#0ae8f0" };
  if (s < 600)  return { tier: "Trusted",   color: "#006bff" };
  if (s < 1000) return { tier: "Verified",  color: "#004796" };
  return               { tier: "Prime",     color: "#0ae8f0" };
}

export function scorePct(score: bigint): number {
  return Math.min((Number(score) / 1000) * 100, 100);
}
