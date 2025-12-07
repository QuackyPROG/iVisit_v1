export function sortGateAware(names: string[]): string[] {
  const gateRegex = /^gate\s*(\d+)\b/i;

  return names.sort((a, b) => {
    const aMatch = gateRegex.exec(a);
    const bMatch = gateRegex.exec(b);

    if (aMatch && bMatch) {
      const aNum = parseInt(aMatch[1], 10);
      const bNum = parseInt(bMatch[1], 10);

      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) {
        return aNum - bNum;
      }
    }

    return a.localeCompare(b);
  });
}
