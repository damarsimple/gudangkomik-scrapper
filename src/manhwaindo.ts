import axios from "axios";
import { uniq } from "lodash";
import { filenameGueser, extExtractor, downloadAndUpload } from "./helper";
import { Chapter, ChapterCandidate, Comic } from "./types";
import { gkInteractor } from "./gkInteractor";
export class Manhwaindo {
  public static getDeclaration() {
    return {
      name: "Manhwaindo",
      url: "https://manhwaindo.id/",
      class: Manhwaindo,
    };
  }
  public static async getUpdates(document: Document) {
    const links = new Set<string>();

    console.log("Manhwaindo detected");
    document.querySelectorAll("a, .series, .data-tooltip").forEach((e) => {
      const link = e.getAttribute("href");
      if (
        link &&
        link.includes("https://manhwaindo.id/series/") &&
        link != "https://manhwaindo.id/series/list-mode/" &&
        !link.includes("https://manhwaindo.id/series/?")
      ) {
        links.add(link);
      }
    });

    const values = Array.from(links);

    return values;
  }

  public static async parseAndUpload(url: string): Promise<Comic> {
    const text = await await (await axios.get(url)).data;

    const doc = new DOMParser().parseFromString(text, "text/html");
    console.log(url);
    const title = doc
      .querySelector("h1")
      .textContent.replace("Komik", "")
      .trim();
    const alt_title = doc
      .querySelector("span, .alternative")
      .textContent.split(",");

    const genres = Array.from(
      doc.querySelector(".mgen").querySelectorAll("a")
    ).map((e) => e.textContent);
    const spans = Array.from(
      doc.querySelector(".bixbox").querySelectorAll(".imptdt")
    ).map((e) => e.textContent);

    const info = spans.reduce((e, c) => {
      const text = c.split(" ");
      return {
        ...e,
        [text[0].trim().toLowerCase()]: text[1].trim(),
      };
    }, {} as Record<string, string>);

    let chapters: ChapterCandidate[] = [];

    doc
      .querySelector("#chapterlist")
      .querySelectorAll("a")
      .forEach((e) => {
        const href = e.getAttribute("href");
        if (href.includes("chapter"))
          chapters.push({
            name: `${parseFloat(e.textContent.replace("Chapter", ""))}`,
            href,
          });
      });

    chapters = uniq(chapters);

    const slug = await gkInteractor.getFromSlug(title);

    const thumbUrl = doc
      .querySelector(".thumb")
      .querySelector("img")
      .getAttribute("src");

    const comic: Comic = {
      name: title,
      alt_name: alt_title,
      slug: slug.result,
      description: doc.querySelector(".entry-content-single").textContent,
      genres: genres,
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
          console.log(i);

          const chapter_req = await axios.get(i);

          const htmls = await chapter_req.data;

          // <link rel="alternate" type = "application/json" href = "https://manhwaindo.id/wp-json/wp/v2/posts/121856" />

          const chapterDoc = new DOMParser().parseFromString(
            htmls,
            "text/html"
          );

          const url = chapterDoc
            .querySelector("link[rel='alternate'][type='application/json']")
            .getAttribute("href");

          const jsonHtml = await (await axios.get(url)).data.content.rendered;

          const chapterJsonDoc = new DOMParser().parseFromString(
            jsonHtml,
            "text/html"
          );

          const imgDom = Array.from(chapterJsonDoc.querySelectorAll("img"));

          const images = imgDom.map((e) => e.getAttribute("src"));

          const target = chapterDoc.querySelector("h1").textContent;

          try {
            const splits = target.split(" ");

            const chunk = splits.splice(splits.length - 1);

            const name = parseFloat(chunk[0]);

            if (isNaN(name)) {
              console.log(`NaN detected ${target}`);
              continue;
            }

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
          console.log(`[${title}] [Chapter ${i}] ${error}`);
        }
      }
    } catch (error) {
      console.log(`[${title}] ${error}`);
    }

    return comic;
  }
}
