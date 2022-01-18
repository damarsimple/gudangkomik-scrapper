import axios from "axios";

export const filenameGueser = (url: string) =>
  url.substring(url.lastIndexOf("/") + 1);
export const extExtractor = (filename: string) => filename.split(".")[1];

export const downloadAndUpload = async (url: string, path: string) => {
  let startTime = new Date().getTime();
  const tobeSaved = `https://sg.storage.bunnycdn.com/komikgudang${path}`;
  const y = await axios.get(url, {
    responseType: "blob",
  });

  const b = y.data;

  let timeDiff = new Date().getTime() - startTime; //in ms

  console.log(`finished download in ${timeDiff} ms ${filenameGueser(url)}`);

  startTime = new Date().getTime();

  const res = await fetch(tobeSaved, {
    method: "PUT",
    body: b,
    headers: {
      AccessKey: "b7405229-91f9-483b-811f63397040-ad00-4247",
      "Content-Type": "application/octet-stream",
    },
  });

  const ulResponse = await res.json();

  timeDiff = new Date().getTime() - startTime; //in ms

  console.log(`finished upload in ${timeDiff} ms ${filenameGueser(url)}`);
  return ulResponse as {
    Message: string;
  };
};
