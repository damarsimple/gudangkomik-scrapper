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
    let outerIter = 0;
    const declarations: {
      name: string;
      url: string;
      class: any;
    }[] = [
        Manhwaindo.getDeclaration(),
        Manhwaland.getDeclaration(),
        Komikcastid.getDeclaration(),
        Komikcast.getDeclaration(),
      ];

    for (const x of declarations) {
      if (location.href == x.url) {



        console.log("fetching ignores and specials");

        const ignores: string[] = await (
          await axios.get("https://gudangkomik.com/api/ignore")
        ).data.ignore;

        const specials: string[] = await (
          await axios.get("https://gudangkomik.com/api/special")
        ).data.special;

        console.log("completed fetch ignores and specials");

        console.log(`detected ${x.name}`);
        const urls = await x.class.getUpdates(document);

        console.log(`Found Specials ${specials.length} comic links`);
        console.log(`Found ${urls.length} comic links`);

        console.log(urls);

        const targets = new Set<string>();

        for (const url of [...specials, ...urls]) {
          targets.add(url);
        }

        for (const link of targets.values()) {
          try {
            outerIter++;

            if (ignores.includes(link)) {
              console.log("ignoreing " + link);
            }
            removeReq(link);
            const comic = await x.class.parseAndUpload(link);
            console.log(
              `[${outerIter}/${urls.length}] [${x.name}] ${comic.name}`
            );
          } catch (error) {
            console.log(
              `[${outerIter}/${urls.length}] [${x.name}] error ${error}`
            );
          }
        }
      } else {
        console.log(`nothing to do ${location.href}`);
      }
    }
  }
}
const removeReq = async (link: string) =>
  await axios.post("https://gudangkomik.com/api/special-remove", {
    special: link,
  });
