import { BungieClient, configure } from 'oodestiny';
import { config } from 'dotenv'
import * as puppeteer from 'puppeteer';
import { BungieMembershipType } from 'oodestiny/schemas';

config();
const { API_KEY, CLIENT_ID, SECRET } = process.env;

configure(API_KEY!, CLIENT_ID!, SECRET!);

/// NAME GOES HERE ///
const bungieName = 'Newo#9010';

console.log('establishing client...')
const client = new BungieClient();
const [displayName, displayNameCode] = bungieName.split('#');

console.log('fetching profile...')
// @ts-ignore
client.Destiny2.SearchDestinyPlayerByBungieName({
    membershipType: BungieMembershipType.All
}, {
    displayName,
    displayNameCode
}).then(res => {
    const { membershipType, membershipId } = res.Response[0]

    console.log('scraping raid report...')
    scrape(platformToText(membershipType), membershipId)
        .then(console.log)
        .catch(console.log)

})

function platformToText(platform: number) {
    switch (platform) {
        case BungieMembershipType.TigerSteam:
            return 'pc'
        case BungieMembershipType.TigerXbox:
            return 'xbox'
        case BungieMembershipType.TigerPsn:
            return 'ps'
        default:
            return 'pc';
    }
}

type RaidInfo = {
    raid: string;
    tags: string[]
}

type TagsDict = {[raid: string]: string[]};

async function scrape(platform: string, id: string): Promise<TagsDict> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`https://raid.report/${platform}/${id}`,
        { waitUntil: 'load' })
    // wait for dots to load
    page.waitForSelector('[id="error-dialog-title"]', {
        timeout: 2000
    })
        .then(e => {
            console.log('Raid.report encountered an error with the profile', {
                platform, id
            })
            process.exit(1);
        })
        .catch(e => null)
    await page.waitForSelector('[class="clickable activity-dot"]', {
        timeout: 0
    })
    return page.evaluate(() => {
        // select each raid
        const cards = document.querySelectorAll('[class="card"]');
        const rv: TagsDict = {}
        // @ts-ignore
        for (const card of cards) {
            // select each tag and the raid name
            const raid = card.querySelector('[class="card-title black-text-shadow"]')?.textContent
                ?? '';
            const tags: NodeList = card.querySelectorAll('[class="new badge truncate drr-tag"]');
            const obj: RaidInfo = {
                raid,
                tags: []
            }
            // @ts-ignore
            for (const tag of tags) {
                // @ts-ignore
                obj.tags.push(tag.textContent)
            }
            rv[obj.raid] = obj.tags;
        }
        return rv;
    })

}