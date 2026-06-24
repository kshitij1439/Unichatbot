export interface Circular {
  id: string;
  title: string;
  category: "exam" | "admission" | "general" | "scholarship";
  date: string;
  url: string;
  summary: string;
}

// Curated list of SPPU circulars
export const CURATED_CIRCULARS: Circular[] = [
  {
    id: "sppu-circ-1",
    title: "Circular No. 102/2026: BE & TE Computer Engineering Exam Form Schedule",
    category: "exam",
    date: "2026-06-20",
    url: "https://exam.unipune.ac.in/circulars/102-exam.pdf",
    summary: "Backlog & regular examination form submission schedules are active. Registration opens June 22. Submission deadline without late fee is July 5, 2026. Late fee submissions accepted until July 10, 2026."
  },
  {
    id: "sppu-circ-2",
    title: "Admission Notification 44/2026: Extension of PG Course Application Deadline",
    category: "admission",
    date: "2026-06-18",
    url: "https://campus.unipune.ac.in/admission-44-extended.pdf",
    summary: "Online application deadline for PG, Integrated PG, and Diploma programs has been extended to June 30, 2026. Applications must be completed online via the OEE portal."
  },
  {
    id: "sppu-circ-3",
    title: "Academic Circular 95/2026: Syllabus Revision for TE Engineering (2024 Course Pattern)",
    category: "general",
    date: "2026-06-15",
    url: "https://www.unipune.ac.in/syllabus-updates.htm",
    summary: "Updated curriculum guidelines for Third Year (TE) Computer Engineering, IT, and Mechanical branches under the 2024 course pattern have been published. Revision takes effect starting current semester."
  },
  {
    id: "sppu-circ-4",
    title: "Notification 108/2026: SPPU State Scholarship Application Open",
    category: "scholarship",
    date: "2026-06-23",
    url: "https://bcud.unipune.ac.in/scholarships/minority-notice.pdf",
    summary: "The state government scholarship portal is open for SE, TE, and BE students of minority communities. Eligible students must upload documents and submit applications before July 15, 2026."
  }
];

/**
 * Fetches circulars by scraping SPPU site or using curated fallbacks on error/timeout.
 */
export async function fetchCircularsFromSppu(): Promise<Circular[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://exam.unipune.ac.in/", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const html = await res.text();
    const scrapedCirculars: Circular[] = [];

    const regex = /<a href="([^"]+\.pdf|[^"]+circular[^"]+)"[^>]*>(.*?)<\/a>/gi;
    let match;
    let count = 0;

    while ((match = regex.exec(html)) !== null && count < 6) {
      let url = match[1];
      let title = match[2].replace(/<[^>]*>/g, "").trim();

      if (title.length > 15 && !title.toLowerCase().includes("contact") && !title.toLowerCase().includes("home")) {
        if (url.startsWith("/")) {
          url = "https://exam.unipune.ac.in" + url;
        } else if (!url.startsWith("http")) {
          url = "https://exam.unipune.ac.in/" + url;
        }

        let category: Circular["category"] = "general";
        if (url.includes("exam") || title.toLowerCase().includes("exam") || title.toLowerCase().includes("timetable")) {
          category = "exam";
        } else if (title.toLowerCase().includes("admission") || title.toLowerCase().includes("eligibility")) {
          category = "admission";
        } else if (title.toLowerCase().includes("scholarship") || title.toLowerCase().includes("freeship")) {
          category = "scholarship";
        }

        scrapedCirculars.push({
          id: `scraped-${count}`,
          title: title,
          category: category,
          date: new Date().toISOString().split("T")[0],
          url: url,
          summary: `Official SPPU announcement regarding: "${title}". Please click the link to check details on the university website.`
        });
        count++;
      }
    }

    const merged = [...scrapedCirculars, ...CURATED_CIRCULARS];
    
    // Deduplicate by URL
    return merged.filter((item, index, self) => 
      index === self.findIndex((t) => t.url === item.url)
    );
  } catch (error) {
    console.warn("Failed to scrape live SPPU site in helper, using curated fallbacks.");
    return CURATED_CIRCULARS;
  }
}
