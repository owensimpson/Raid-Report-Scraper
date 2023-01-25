import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { PGCRInfo, RaidDict, RaidInfo } from './types';
import { insert, get } from './requests';

type QueueItem = [string, string, (value: RaidDict) => void]

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
    // @ts-ignore
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
      const info = await page.evaluate(async () => {
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
          const dots: NodeListOf<HTMLAnchorElement> = card.querySelectorAll('[class="clickable activity-dot"]');
          const obj: RaidInfo = {
            raid,
            tags: [],
          }

          await Promise.all(Array.from(dots).map(dot => {
            // @ts-ignore
            const href = dot.href.animVal;
            return get(`http://localhost:8000${href}`)
            .then(response => response.json())
            .then(async (res: PGCRInfo) => {
              obj.tags.push({
                raid,
                ...(res.id ? {id: res.id, tags: res.tags} : await this.scrapeDot(href))
              })
            })
            .catch(console.error);
          }))
          rv[obj.raid] = obj;
        }
        return rv;
      }, {timeout: 0 });

      page.close().catch(console.error);
      return info;
    })

    }

  private async scrapeDot(ref: string): Promise<PGCRInfo> {
    const page = await (await this.browser).newPage();
    await page.goto(`https://raid.report${ref}`);
    await page.waitForSelector('[class="TBD"]', {
      timeout: 0
    })
    return page.evaluate(() => {
      const returnObject = {
        id: parseInt(ref.split("/")[2]),
        tags: [],
      }
      const tags: NodeListOf<HTMLSpanElement> = document.querySelectorAll('[class="TBD"]');
      for (const tag of tags) {
        // @ts-ignore
        returnObject.tags.push(tag.textContent!)
      }
      insert(returnObject);
      return returnObject;
    });

  }

}