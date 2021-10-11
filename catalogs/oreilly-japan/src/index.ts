import path from "path";
import puppeteer from "puppeteer";
import fs from "fs-extra";

export const output = async (structure: [string, unknown][]) =>
  Promise.all(
    structure.map(async ([fileName, data]) => {
      const filePath = path.resolve(process.cwd(), "dist", fileName + ".json");
      await fs
        .access(filePath, fs.constants.F_OK)
        .then(() => {
          console.log(`Skipped: ${filePath}`);
        })
        .catch(() =>
          fs
            .ensureFile(filePath)
            .then(() => fs.writeFile(filePath, JSON.stringify(data)))
            .then(() => {
              console.log(`Generated: ${filePath}`);
            })
        );
    })
  );

export const bootstrap = async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.goto(`https://www.oreilly.co.jp/catalog/`);

  const $rows = await page.$$("#bookTable > tbody > tr");
  const list = await Promise.all(
    $rows.map(async ($row) => ({
      type: "book",
      isbn: (await $row
        .$("td:nth-child(1)")
        .then(($el) => $el?.getProperty("textContent"))
        .then(($content) => $content?.jsonValue())) as string,
      title: (await $row
        .$("td:nth-child(2)")
        .then(($el) => $el?.getProperty("textContent"))
        .then(($content) => $content?.jsonValue())) as string,
      publishedAt: (await $row
        .$("td:nth-child(4)")
        .then(($el) => $el?.getProperty("textContent"))
        .then(($content) => $content?.jsonValue())) as string,
    }))
  );

  const files = list.map((listItem): [string, typeof list[number]] => [
    listItem.isbn,
    listItem,
  ]);
  await output(files);

  await browser.close();
};

(async () => {
  await bootstrap();
})();
