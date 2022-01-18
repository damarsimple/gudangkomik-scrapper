import axios from "axios";
import { uniq } from "lodash";
import { filenameGueser, extExtractor, downloadAndUpload } from "./helper";
import { Chapter, ChapterCandidate, Comic } from "./types";
import { gkInteractor } from "./gkInteractor";
export class Komikcastid {
  public static getDeclaration() {
    return {
      name: "komicastid",
      url: "https://komikcastid.com/komik-terbaru/",
      class: Komikcastid,
    };
  }
  public static async getUpdates(document: Document) {
    const links = new Set<string>();

    console.log("Komikcastid detected");

    document.querySelectorAll("a").forEach((e) => {
      try {
        const link = e.getAttribute("href");
        if (link && link.includes("https://komikcastid.com/komik/")) {
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

    const title = doc.querySelector("h1").textContent.replace("Komik ", "");

    const infos = doc.querySelector(".spe").querySelectorAll("span");

    const alt_title = infos[0].textContent
      .replace("Judul Alternatif: ", "")
      .split(",");
    const genres = Array.from(
      doc.querySelector(".genre-info").querySelectorAll("a")
    ).map((e) => e.textContent);

    const info = Array.from(infos).reduce((e, c) => {
      const text = c.textContent.split(":");
      return {
        ...e,
        [text[0].trim().toLowerCase()]: text[1].trim(),
      };
    }, {} as Record<string, string>);

    let chapters: ChapterCandidate[] = [];

    doc
      .querySelector("#chapter_list")
      .querySelector("ul")
      .querySelectorAll("li")
      .forEach((e) => {
        const href = e.querySelector("a").getAttribute("href");

        const name = `${parseFloat(e.textContent.replace("Chapter", ""))}`;

        chapters.push({
          href,
          name,
        });
      });

    chapters = uniq([...chapters]);

    const slug = await gkInteractor.getFromSlug(title);

    const thumbUrl = doc
      .querySelector(".thumb")
      .querySelector("img")
      .getAttribute("src");

    const comic: Comic = {
      name: title,
      alt_name: alt_title,
      slug: slug.result,
      description: doc.querySelector(".kshortcsc, .sht2").textContent,
      genres: genres,
      rating: 7.5,
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
            chapterDoc.querySelector("#chimg").querySelectorAll("img")
          );

          const images = imgDom.map((e) => e.getAttribute("src"));

          const target = chapterDoc.querySelector("h1").textContent;
          console.log(`[${iter}/${chapterscandidate.length}] begin ${target}`);

          try {
            const splits = target.split(" ");

            const chunk = splits[splits.length - 1];

            const name = parseFloat(
              isNaN(parseFloat(chunk[1])) ? chunk[0] : chunk[1]
            );

            if (isNaN(name)) {
              console.log(
                `[${iter}/${chapterscandidate.length}] skip ${target} ${name} NAN DETECTED`
              );
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
            console.log(
              `[${title}] [Chapter ${target}] sanityEclipseError error ${error}`
            );
          }
          console.log(`[${iter}/${chapterscandidate.length}] finish ${target}`);
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
