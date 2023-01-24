import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';

type QueueItem = [string, string, (value: RaidDict) => void]
type RaidInfo = {
  raid: string;
  lowmans: number;
  dots: string[];
  tags: string[];
}
type RaidDict = {[raid: string]: RaidInfo};

export class ScraperClient {
  static MAX_THREADS = 12;
  private queue: QueueItem[];
  private enqueued: number;
  private browser: Promise<Browser>;

  constructor() {
    this.enqueued = 0;
    this.queue = [];
    this.browser = puppeteer.launch({ headless: true }).then(async browser => {
      // turn on star mode only
      const [page] = await browser.pages();
      await page.goto(`https://raid.report/settings`,
          { waitUntil: 'load', timeout: 0 });
      await page.waitForSelector('[value="star"]');
      await page.evaluate(() => {
        const button = document.querySelector<HTMLInputElement>('[value="star"]')!;
        button.click();
      })
      return browser;
    });
  }


  async scrapeProfile(id: string, platform: string): Promise<RaidDict> {
    const promise = new Promise<RaidDict>((resolve) => {
      this.queue.push([id, platform, resolve]);
    });
    this.processQueue();
    return promise;
  }

  private processQueue() {
    //console.log("processing queue", this.queue)
    if (this.queue.length === 0 || this.enqueued >= ScraperClient.MAX_THREADS) return;
    const [id, platform, resolve] = this.queue.shift()!;
    this.enqueued++;
    this.scrape(id, platform)
      .then(resolve).then(() => {
        this.enqueued--;
        this.processQueue();
    })
  }

  private async scrape(id: string, platform: string): Promise<RaidDict> {
    const page = await (await this.browser).newPage();
    await page.goto(`https://raid.report/${platform}/${id}`,
        { waitUntil: 'load', timeout: 0 })
    // wait for dots to load
    return page.waitForSelector('[id="error-dialog-title"]', {
      timeout: 2000
    })
    .then(() => {
      console.log('Raid.report encountered an error with the profile', {
        platform, id
      })
      return {};
    })
    .catch(async () => {
      await page.waitForSelector('[class="clickable activity-dot"]', {
        timeout: 0
      })
      await page.setViewport({width: 30000, height: 1920})
      const info = await page.evaluate(() => {
        // select each raid
        const container = document.querySelector<HTMLElement>('[class="drr-container"]')!
        if (container) {
          container.style.maxWidth = "5000px"
          container.style.width = "100%"
          container.style.maxHeight = "700px"
        }
        const cards = document.querySelectorAll('[class="card"]');
        const rv: RaidDict = {}
        // @ts-ignore
        for (const card of cards) {
          // select each tag and the raid name
          const raid = card.querySelector('[class="card-title black-text-shadow"]')?.textContent
              ?? '';
          const tags: NodeListOf<HTMLSpanElement> = card.querySelectorAll('[class="new badge truncate drr-tag"]');
          const dots: NodeListOf<HTMLAnchorElement> = card.querySelectorAll('[class="clickable activity-dot"]');
          const obj: RaidInfo = {
            raid,
            lowmans: 0,
            dots: [],
            tags: []
          }
          for (const dot of dots) {
            // @ts-ignore
            const href = dot.href.animVal;
            obj.dots.push(href);
          }
          for (const tag of tags) {
            obj.tags.push(tag.textContent!)
          }
          rv[obj.raid] = obj;
        }
        return rv;
      }, {timeout: 0 });

      await Promise.all(Object.keys(info).map(raid => (
         info[raid].dots.map(async dot => (
             await fetch('http://localhost:8000/pgcr', {
               method: 'POST',
               headers: {
                 'Accept': 'application/json',
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify({id: dot.split("/")[2], tags: ["test"]})
             })
         ))
      )));
      page.close().catch(console.error);
      return info;
    })

  }
}