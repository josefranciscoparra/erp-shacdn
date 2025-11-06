export function updateThemeMode(value: "light" | "dark") {
  const doc = document.documentElement;
  doc.classList.add("disable-transitions");
  doc.classList.toggle("dark", value === "dark");
  requestAnimationFrame(() => {
    doc.classList.remove("disable-transitions");
  });
}

export function updateThemePreset(value: string) {
  document.documentElement.setAttribute("data-theme-preset", value);
}

export function updateThemeRadius(value: string) {
  document.documentElement.setAttribute("data-theme-radius", value);
}

export function updateThemeContentLayout(value: string) {
  document.documentElement.setAttribute("data-theme-content-layout", value);
}
