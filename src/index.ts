import { Komikcastid } from "./komicastid";
import axios from "axios";
import { Komikcast } from "./komikcast";
import { Manhwaindo } from "./manhwaindo";
import { Manhwaland } from "./manhwaland";

main();

async function main() {
  console.log(`main called document state ${document.readyState}`);
  if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
  ) {
    console.log("fetching ignores and specials");

    const ignores: string[] = await (
      await axios.get("https://gudangkomik.com/api/ignore")
    ).data.ignore;

    const specials: string[] = await (
      await axios.get("https://gudangkomik.com/api/special")
    ).data.special;

    console.log("completed fetch ignores and specials");

    const links = new Set<string>();
    let outerIter = 0;

    if (location.href == "https://komikcast.com/") {
      const urls = await Komikcast.getUpdates(document);

      const myspecials = specials.filter((e) =>
        e.includes("https://komikcast.com")
      );

      console.log(`Found Specials ${myspecials.length} comic links`);
      console.log(`Found ${urls.length} comic links`);

      console.log(urls);

      for (const link of [...urls, ...myspecials]) {
        outerIter++;

        if (ignores.includes(link)) {
          console.log("ignoreing " + link);
        }
        removeReq(link);
        const comic = await Komikcast.parseAndUpload(link);
        console.log(
          `[${outerIter}/${urls.length}] [Komikcast.com] ${comic.name}`
        );
      }
    }

    if (location.href == "https://komikcastid.com/") {
      const urls = await Komikcastid.getUpdates(document);

      const myspecials = specials.filter((e) =>
        e.includes("https://komikcastid.com")
      );

      console.log(`Found Specials ${myspecials.length} comic links`);
      console.log(`Found ${urls.length} comic links`);

      console.log(urls);

      for (const link of [...urls, ...myspecials]) {
        outerIter++;

        if (ignores.includes(link)) {
          console.log("ignoreing " + link);
        }
        removeReq(link);
        const comic = await Komikcastid.parseAndUpload(link);
        console.log(
          `[${outerIter}/${urls.length}] [Komikcastid.com] ${comic.name}`
        );
      }
    }

    if (location.href == "https://manhwaindo.id/") {
      const urls = await Manhwaindo.getUpdates(document);
      const myspecials = specials.filter((e) =>
        e.includes("https://manhwaindo.id")
      );

      console.log(`Found Specials ${myspecials.length} comic links`);
      console.log(`Found ${urls.length} comic links`);
      for (const link of [...urls, ...urls]) {
        outerIter++;
        if (ignores.includes(link)) {
          console.log("ignoreing " + link);
        }

        removeReq(link);

        const comic = await Manhwaindo.parseAndUpload(link);
        if (comic)
          console.log(
            `[${outerIter}/${urls.length}] [Manhwaindo.id] ${comic.name}`
          );
      }
    }

    if (location.href == "https://manhwaland.icu/") {
      const myspecials = specials.filter((e) =>
        e.includes("https://manhwaland.icu")
      );

      console.log(`Found Specials ${myspecials.length} comic links`);
      const urls = await Manhwaland.getUpdates(document);
      console.log(`Found ${urls.length} comic links`);
      for (const link of urls) {
        outerIter++;
        if (ignores.includes(link)) {
          console.log("ignoreing " + link);
        }
        removeReq(link);
        const comic = await Manhwaland.parseAndUpload(link);
        if (comic)
          console.log(
            `[${outerIter}/${urls.length}] [Manhwaland.icu] ${comic.name}`
          );
      }
    }
  }
}
const removeReq = async (link: string) =>
  await axios.post("https://gudangkomik.com/api/special-remove", {
    special: link,
  });
