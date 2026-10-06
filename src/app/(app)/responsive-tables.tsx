"use client";

import { useEffect } from "react";

// Tabellen mit Kopfzeile werden auf dem Smartphone als Karten dargestellt (CSS .stack).
// Dafür bekommt jede Zelle die Spaltenüberschrift als data-label. Ein Observer hält das
// auch nach Navigation und Server-Aktionen aktuell.
function labelTables(root: ParentNode) {
  root.querySelectorAll("table").forEach(table => {
    const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent?.trim() ?? "");
    if (!headers.length) return;
    table.classList.add("stack");
    table.querySelectorAll("tbody tr").forEach(row => {
      Array.from(row.children).forEach((cell, index) => {
        const label = headers[index] ?? "";
        if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
      });
    });
  });
}

export function ResponsiveTables() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    labelTables(main);
    const observer = new MutationObserver(() => labelTables(main));
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
