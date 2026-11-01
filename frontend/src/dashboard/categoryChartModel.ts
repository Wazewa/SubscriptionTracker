import type { CategoryTotal } from './model';

export const categoryColors = ['#2e9b62', '#195637', '#747c79', '#84b69b'];

function point(radius: number, angle: number): string {
  const radians = angle * Math.PI / 180;
  return `${100 + radius * Math.sin(radians)} ${100 - radius * Math.cos(radians)}`;
}

// Two arcs per edge also render a complete ring for a single category.
export function donutPath(start: number, end: number): string {
  const middle = (start + end) / 2;
  return `M ${point(100, start)} A 100 100 0 0 1 ${point(100, middle)} A 100 100 0 0 1 ${point(100, end)} L ${point(54, end)} A 54 54 0 0 0 ${point(54, middle)} A 54 54 0 0 0 ${point(54, start)} Z`;
}

export function categorySegments(categories: CategoryTotal[]) {
  const visible = categories.filter((category) => category.amountMinor > 0);
  const total = visible.reduce((sum, category) => sum + category.amountMinor, 0);
  let cumulative = 0;
  return visible.map((category, index) => {
    const start = cumulative;
    cumulative += category.amountMinor / total * 360;
    const end = index === visible.length - 1 ? 360 : cumulative;
    return { category, start, end, color: categoryColors[index % categoryColors.length], path: donutPath(start, end) };
  });
}
