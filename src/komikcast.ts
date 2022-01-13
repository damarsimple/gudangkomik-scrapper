import axios from "axios";
import { uniq } from "lodash";
import { filenameGueser, extExtractor, downloadAndUpload } from "./helper";
import { Chapter, ChapterCandidate, Comic } from "./types";
import { gkInteractor } from "./gkInteractor";
export class Komikcast {
  public static async getUpdates(document: Document) {
    const links = new Set<string>();

    console.log("Komikcast detected");
    document.querySelectorAll("a").forEach((e) => {
      try {
        const link = e.getAttribute("href");
        if (link && link.includes("https://komikcast.com/komik/")) {
          links.add(link);
        }
      } catch (error) {}
    });

    const values = Array.from(links);

    return values;
  }

  public static async parseAndUpload(url: string): Promise<Comic> {
    const text = await await (await axios.get(url)).data;

    const doc = new DOMParser().parseFromString(text, "text/html");

    const title = doc
      .querySelector("h1")
      .textContent.replace(" Bahasa Indonesia", "");
    const alt_title = doc
      .querySelector(".komik_info-content-native")
      .textContent.split(",");

    const genres = Array.from(
      doc.querySelector(".komik_info-content-genre").querySelectorAll("a")
    ).map((e) => e.textContent);
    const spans = Array.from(
      doc.querySelector(".komik_info-content-meta").querySelectorAll("span")
    );
    const info = spans.reduce((e, c) => {
      const text = c.textContent.split(":");
      return {
        ...e,
        [text[0].trim().toLowerCase()]: text[1].trim(),
      };
    }, {} as Record<string, string>);

    const HQChapter: ChapterCandidate[] = [];
    doc
      .querySelector(".komik_info-chapters")
      .querySelectorAll("a, .chapter-link-item")
      .forEach((e) => {
        const href = e.getAttribute("href");

        if (e.textContent.includes("HQ"))
          HQChapter.push({
            name: `${parseFloat(e.textContent.replace("Chapter", ""))}`,
            href,
          });
      });

    const HQStrings = HQChapter.map((e) => e.name);
    if (HQStrings.length > 0)
      console.log(`HQ ${title} detected ${HQStrings.length}`);

    let chapters: ChapterCandidate[] = [];

    doc
      .querySelector(".komik_info-chapters")
      .querySelectorAll("a, .chapter-link-item")
      .forEach((e) => {
        const href = e.getAttribute("href");

        const name = `${parseFloat(e.textContent.replace("Chapter", ""))}`;

        if (!HQStrings.includes(name))
          chapters.push({
            name,
            href,
          });
      });

    chapters = uniq([...chapters, ...HQChapter]);

    const slug = await gkInteractor.getFromSlug(title);

    const thumbUrl = doc
      .querySelector(".komik_info-content-thumbnail")
      .querySelector("img")
      .getAttribute("src");

    const comic: Comic = {
      name: title,
      alt_name: alt_title,
      slug: slug.result,
      description: doc.querySelector(".komik_info-description-sinopsis")
        .textContent,
      genres: genres,
      rating: parseFloat(
        doc.querySelector(".data-rating").textContent.replace("Rating ", "")
      ).toString(),
      ...(info as unknown as Comic),
    };

    if (!slug.exist) {
      const filename = filenameGueser(thumbUrl);
      const ext = extExtractor(filename);
      const internalFilename = `thumb.${ext}`;
      const internalPath = `/${slug.result}/${internalFilename}`;

      const ulResponse = await downloadAndUpload(thumbUrl, internalPath);

      console.log(
        `[${slug.result}] [${internalFilename}] ${ulResponse.Message}`
      );

      comic["thumb"] = internalPath;
    }

    try {
      const { chapterscandidate } = await gkInteractor.sanityCheck(
        comic,
        chapters
      );

      let iter = 0;

      for (let i of chapterscandidate) {
        iter++;
        try {
          const chapter_req = await axios.get(i);

          const htmls = await chapter_req.data;

          const chapterDoc = new DOMParser().parseFromString(
            htmls,
            "text/html"
          );

          const imgDom = Array.from(
            chapterDoc
              .querySelector(".main-reading-area")
              .querySelectorAll("img")
          );

          const images = imgDom.map((e) => e.getAttribute("src"));

          const target = chapterDoc.querySelector("h1").textContent;
          console.log(`[${iter}/${chapterscandidate.length}] ${target}`);

          try {
            const splits = target.split(" ");

            const chunk = splits.splice(splits.length - 4);

            const name = parseFloat(
              isNaN(parseFloat(chunk[1])) ? chunk[0] : chunk[1]
            );

            if (isNaN(name)) continue;

            const chapter: Chapter = {
              name: `${name}`,
              image_count: 0,
              original_image_count: imgDom.length,
              processed: true,
              images: [],
              quality: 0,
            };

            console.log(chapter);

            let idx = 0;

            for (const x of images) {
              const filename = filenameGueser(x);
              const ext = extExtractor(filename);

              const internalFilename = `${idx}.${ext}`;
              const internalPath = `/${comic.slug}/${chapter.name}/${internalFilename}`;

              const ulResponse = await downloadAndUpload(x, internalPath);

              console.log(
                `[${title}] [Chapter ${chapter.name}] [${internalFilename}] ${ulResponse.Message}`
              );

              chapter.images.push(internalPath);
              chapter.image_count++;
              idx++;
            }

            await gkInteractor.sanityEclipse(comic.slug, chapter);
          } catch (error) {
            console.log(`[${title}] [Chapter ${target}] ${error}`);
          }
        } catch (error) {
          console.log(error);
        }
      }
    } catch (error) {
      console.log(error);
    }

    return comic;
  }
}
