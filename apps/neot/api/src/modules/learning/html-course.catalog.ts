export type HtmlCourseLesson = {
  content: string;
  sourceUrl: string;
  title: string;
};

const steps = [
  [
    "Meet HTML",
    "html_intro.asp",
    "Learn what HTML is and how a browser turns a document into a web page."
  ],
  [
    "Create your first page",
    "html_basic.asp",
    "Create a small page with a doctype, head, title, and body."
  ],
  [
    "Add text",
    "html_headings.asp",
    "Organize readable content with headings, paragraphs, emphasis, and comments."
  ],
  [
    "Connect pages",
    "html_links.asp",
    "Add useful links and images with meaningful text and alternative descriptions."
  ],
  [
    "Organize information",
    "html_lists.asp",
    "Use lists and tables to present collections and structured data."
  ],
  [
    "Build a form",
    "html_forms.asp",
    "Collect user input with labels, suitable controls, and a submit button."
  ],
  [
    "Structure the layout",
    "html5_semantic_elements.asp",
    "Use semantic sections so people and tools understand the page."
  ],
  [
    "Finish a responsive page",
    "html_responsive.asp",
    "Combine the course steps into one page that works on mobile and desktop."
  ]
] as const;

export const htmlCourseLessons: HtmlCourseLesson[] = steps.map(([title, path, summary], index) => ({
  content: `${summary}\n\nTry it: complete this step in one small HTML file, open it in a browser, and fix any visible issue.\n\nStep ${index + 1} of ${steps.length}.`,
  sourceUrl: `https://www.w3schools.com/html/${path}`,
  title
}));
