export type ProjectFilterChoice<T extends string = string> = {
  badge?: string;
  id: T;
  label: string;
};

/**
 * Keeps the first filter row focused on the full list and the user's ranked
 * preferences. A category picked from the expanded list stays visible after
 * it is folded again.
 */
export function getQuickProjectFilterChoices<T extends string>(
  choices: readonly ProjectFilterChoice<T>[],
  allChoiceId: T,
  selectedChoiceId: T,
) {
  const initialChoices = choices.filter(
    (choice) => choice.id === allChoiceId || Boolean(choice.badge),
  );
  const quickChoices = initialChoices.length > 0 ? initialChoices : choices.slice(0, 4);
  const selectedChoice = choices.find((choice) => choice.id === selectedChoiceId);

  if (selectedChoice && !quickChoices.some((choice) => choice.id === selectedChoice.id)) {
    return [...quickChoices, selectedChoice];
  }

  return quickChoices;
}

export function getRemainingProjectFilterChoices<T extends string>(
  choices: readonly ProjectFilterChoice<T>[],
  quickChoices: readonly ProjectFilterChoice<T>[],
) {
  const quickChoiceIds = new Set(quickChoices.map((choice) => choice.id));
  return choices.filter((choice) => !quickChoiceIds.has(choice.id));
}
