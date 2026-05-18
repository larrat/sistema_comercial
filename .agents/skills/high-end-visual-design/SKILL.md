---
name: high-end-visual-design
description: Guidelines for ultra-premium dark theme layouts, sophisticated typography, HSL tailored color schemes, and seamless micro-animations.
---

# High-End Visual Design & Micro-Animations Skill

Use this skill when designing new screens, components, lists, cards, page layouts, or refining existing frontend elements inside the Sistema Comercial stack.

## 🎨 1. Premium Color Systems & Glassmorphism
Avoid generic colors (pure red, blue, green). Always use sophisticated, harmonized color palettes:

* **Dark Themes**: Deep slates and obsidian tones (`bg-slate-950`, `bg-slate-900`, `border-white/5` or `border-white/10`).
* **Frosted Glass (Backdrop Blur)**: Use glassmorphism filters for cards and panels:
  ```tsx
  className="bg-slate-950/80 backdrop-blur-md border border-white/10"
  ```
* **Accents of Gold & Emerald**: For badges and metrics, use premium golds (`text-[#C5A059]`) or elegant emerald tones (`text-emerald-400`).

## ✍️ 2. Dynamic Details & Typography
* Use modern, sleek sans-serif or display fonts (e.g. Outfit, Inter).
* **Hover-based Details Card**: When showing dense variants list, use absolute popovers that appear smoothly on parent hover using tailwind group modifiers:
  ```tsx
  className="relative group"
  // Inside the cell:
  className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
  ```

## ✨ 3. Premium Interactive Micro-Animations
* Buttons, cards, and inputs should have subtle scale transitions when hovered:
  ```tsx
  className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
  ```
* Lists should load with sutil fade-in animations to ensure a seamless feeling of speed.
