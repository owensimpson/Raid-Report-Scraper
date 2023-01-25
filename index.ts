import { ScraperClient } from './ScraperClient.js';
import { configure, BungieClient } from 'oodestiny';
import dotenv from 'dotenv'
import { platformToText } from './util.js';

dotenv.config();
const { API_KEY, CLIENT_ID, SECRET } = process.env;

configure(API_KEY!, CLIENT_ID!, SECRET!);

const bungie = new BungieClient();
const client = new ScraperClient();

bungie.GroupV2.GetMembersOfGroup({currentpage: 0, groupId: '4807278'}).then(gr => {
  return [gr.Response.results[0]].map(member =>
      client.scrapeProfile(member.destinyUserInfo.membershipId, platformToText(member.destinyUserInfo.membershipType)))
}).then(async arr => arr.map(async promise => console.log(await promise)))