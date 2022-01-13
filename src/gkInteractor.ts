import axios from "axios";
import { host } from "./env";
import { Comic, Chapter, ChapterCandidate } from "./types";

export class gkInteractor {
  public static async getFromSlug(title: string) {
    const slug = await (await axios.post(host + "/sluggifier", { title })).data;

    return slug as {
      result: string;
      exist: boolean;
    };
  }

  public static async sanityCheck(comic: Comic, chapters: ChapterCandidate[]) {
    console.log(`[${comic.name}] Checking ${comic.name} sanityCheck()`);

    try {
      const servereq = await axios.post(
        host + "/sanity-checks",
        {
          data: comic,
        },
        {
          withCredentials: true,
          headers: {
            Cookie:
              "allow_hentai=eyJpdiI6IjY5WHlveHRxdHprTFlPdjgzZmtld3c9PSIsInZhbHVlIjoiamFQTDFmcGdueTFYY3NDcUY0bGt3Sm45RUdESE8zYjNIb2ZNRjVPRUFkai8wdHFjeEJOSlVlQlhrU01FRkEwWSIsIm1hYyI6ImNiMmFiYTM2MWRlNTlkYzVjZDYzOTg0NzkxYjA4NjViNjVjZWVmMjkyMDIzNmQ2YjFlNjNjM2I1MGY3ZDEyNmEiLCJ0YWciOiIifQ%3D%3D;",
          },
        }
      );
      const serverdata = servereq.data;

      const serverchapters = serverdata.chapters.map(
        (e: { name: string }) => `${e.name}`
      );

      const chapterscandidate = [];
      for (let i of chapters) {
        if (!serverchapters.includes(i.name)) {
          chapterscandidate.push(i.href);
        }
      }

      if (chapterscandidate.length != 0) {
        console.log(
          `found ${chapterscandidate.length} new chapters of ${comic.name}`
        );
      } else {
        console.log(`no new chapter for ${comic.name}`);
      }

      return {
        chapterscandidate,
      };
    } catch (error) {
      console.log(`error sanityCheck() ${comic.name}`);
      console.log(error.response);
      throw error;
    }
  }

  public static async sanityEclipse(title: string, chapter: Chapter) {
    if (chapter.image_count == 0) {
      console.log("no image found");
      return;
    }

    const serverchapterreq = await fetch(host + "/sanity-eclipse", {
      body: JSON.stringify({ title, chapter }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    switch (serverchapterreq.status) {
      case 200:
        console.log(`[${title}] [Chapter ${chapter.name}] Success ${title}`);
        break;
      case 200:
        console.log(`[${title}] [Chapter ${chapter.name}] Exists? ${title}`);
        break;
      default:
        console.log(
          `[${title}] [Chapter ${chapter.name}] ggwp ${title} ${
            serverchapterreq.status
          } ${JSON.stringify(await serverchapterreq.json())}`
        );
        break;
    }

    return;
  }
}
