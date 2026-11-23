export type LessonCard = {
  title: string;
  paragraphs: readonly string[];
  /** Mono formula. Rendered after the first `formulaAfter` paragraphs, or at the end. */
  formula?: string;
  formulaAfter?: number;
};

export const lessonsBySlug = {
  vectors: [
    {
      title: "A vector is a point",
      paragraphs: [
        "A vector is a list of numbers that points to a place in space.",
        "In two dimensions, that list has an x and a y, like [3, 2]. You can picture it as an arrow that starts at the origin [0, 0] and ends at that point.",
        "The two numbers are the coordinates of the tip.",
      ],
    },
    {
      title: "Coordinates",
      paragraphs: [
        "Each number is one axis. x is left and right. y is up and down.",
        "This level's plot goes from −5 to 5 on both axes, with a grid every 1. You can move in steps of 0.5.",
        "Your vector and the target are just two points on the same plane.",
      ],
    },
    {
      title: "Straight-line distance",
      paragraphs: [
        "The distance between two vectors tells you how far apart they are.",
        "This level uses Euclidean distance: the straight-line length from your arrow tip to the target. It is the same length you get from the Pythagorean theorem.",
      ],
      formula: "d = sqrt( (x2 − x1)² + (y2 − y1)² )",
    },
    {
      title: "Your turn",
      paragraphs: [
        "You will see a target point. Drag your arrow, or type the x and y, so the tip lands on it.",
        "The closer you land, the higher you score. There are three targets. You pass with 70 or more out of 100.",
      ],
    },
  ],
  embeddings: [
    {
      title: "Words have coordinates",
      paragraphs: [
        "Computers do not understand words the way you do. An embedding model turns a word or a sentence into a vector — a long list of numbers.",
        "Those numbers are coordinates in a space with many dimensions. The model places similar meanings close together.",
        "So distance starts to mean something new: closeness in meaning, not just closeness on a page.",
      ],
    },
    {
      title: "A much longer list",
      paragraphs: [
        "In level 1 you saw a 2D vector like [3, 2]. An embedding is the same idea, just much longer.",
        "The model this app uses is OpenAI's text-embedding-3-small. By default it produces 1536 numbers. It also accepts a dimensions parameter if you want a shorter vector, but here we keep the default size.",
        "You will not read those 1536 numbers. You will only look at the distance between them.",
      ],
    },
    {
      title: "Cosine distance",
      paragraphs: [
        "To compare two embeddings, we look at the angle between them, not the straight-line gap from level 1.",
        "Cosine similarity is high, close to 1, when two vectors point in almost the same direction. Cosine distance is small when the meanings are close.",
        "pgvector's <=> operator returns cosine distance. Officially, cosine similarity is:",
        "OpenAI's embeddings are normalized to length 1, which is why comparing direction is the usual way to compare meaning.",
      ],
      formula: "1 - (embedding <=> target)",
      formulaAfter: 3,
    },
    {
      title: "Your turn",
      paragraphs: [
        "You will see a target word and four other words. Pick the one whose meaning should sit closest to the target.",
        "The app stores each word's embedding in Postgres with pgvector, then asks the database to sort the four candidates by <=>. The first row is the closest.",
        "The ranking comes from that live query, not from a memorized answer in this file.",
      ],
    },
  ],
  search: [
    {
      title: "Find the nearest",
      paragraphs: [
        "A vector database can search a whole collection, not just two words. You give it a query; it returns the nearest documents.",
        "That is nearest-neighbor search. Your query is turned into an embedding in the same space as the documents. The database then returns the ones with the smallest distance.",
        '"Top 3" just means the three nearest rows.',
      ],
    },
    {
      title: "What pgvector adds",
      paragraphs: [
        "pgvector is a Postgres extension. It adds a vector column type and operators for measuring distance.",
        "Once embeddings live in a table, nearest-neighbor search is an ordinary query: order the rows by distance and keep the first k.",
        "This app ranks documents with cosine distance, using the <=> operator you met in level 2.",
      ],
    },
    {
      title: "Three distance operators",
      paragraphs: [
        "pgvector gives you three main operators. Each returns a distance, so smaller means closer.",
        "<-> is L2 distance, also called Euclidean distance. It is the straight-line length from level 1.",
        "<=> is cosine distance. This is the operator this app uses for embeddings.",
        '<#> is the negative inner product. It is negative so that "smaller is closer" still holds, because Postgres index scans on these operators only go in ascending order.',
      ],
    },
    {
      title: "Your turn",
      paragraphs: [
        "You will see one target document from a set of eight. Write a short query that should pull that document into the top 3.",
        "The app embeds your query live, then runs a pgvector search ordered by <=>, limited to 3 rows. If the target is in those three, you pass.",
        "Because the embeddings are computed live, a suggested query in this file is only an expected result, not a guarantee.",
      ],
    },
  ],
} as const satisfies Record<string, readonly LessonCard[]>;

export type LessonSlug = keyof typeof lessonsBySlug;

export function isLessonSlug(slug: string): slug is LessonSlug {
  return Object.prototype.hasOwnProperty.call(lessonsBySlug, slug);
}

export function getLesson(slug: string): readonly LessonCard[] | undefined {
  if (!isLessonSlug(slug)) return undefined;
  return lessonsBySlug[slug];
}
