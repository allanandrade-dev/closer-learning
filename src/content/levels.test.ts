import { expect, test } from "vitest";

import { lessonsBySlug, type LessonSlug } from "@/content/levels";

const slugs = ["vectors", "embeddings", "search"] as const satisfies readonly LessonSlug[];

test.each(slugs)("%s has 4 cards with non-empty titles", (slug) => {
  const cards = lessonsBySlug[slug];

  expect(cards).toHaveLength(4);
  for (const card of cards) {
    expect(card.title.trim().length).toBeGreaterThan(0);
    expect(card.paragraphs.length).toBeGreaterThan(0);
    for (const paragraph of card.paragraphs) {
      expect(paragraph.trim().length).toBeGreaterThan(0);
    }
  }
});

test("formula blocks are the lesson equations, not challenge data", () => {
  expect(lessonsBySlug.vectors[2]?.formula).toBe(
    "d = sqrt( (x2 − x1)² + (y2 − y1)² )",
  );
  expect(lessonsBySlug.embeddings[2]?.formula).toBe("1 - (embedding <=> target)");

  const blob = JSON.stringify(lessonsBySlug);
  expect(blob).not.toContain("banana");
  expect(blob).not.toContain("Reusable rockets");
  expect(blob).not.toContain("[−4, 2.5]");
});
