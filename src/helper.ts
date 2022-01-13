import axios from "axios";

export const filenameGueser = (url: string) =>
  url.substring(url.lastIndexOf("/") + 1);
export const extExtractor = (filename: string) => filename.split(".")[1];

export const downloadAndUpload = async (url: string, path: string) => {
  const tobeSaved = `https://sg.storage.bunnycdn.com/komikgudang${path}`;
  const y = await axios.get(url, {
    responseType: "blob",
  });

  const b = y.data;

  const res = await fetch(tobeSaved, {
    method: "PUT",
    body: b,
    headers: {
      AccessKey: "21143197-f369-4fd4-801a41b5119f-d960-4f8e",
      "Content-Type": "application/octet-stream",
    },
  });

  const ulResponse = await res.json();

  return ulResponse as {
    Message: string;
  };
};
