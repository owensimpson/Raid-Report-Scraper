import { BungieClient, configure } from 'oodestiny';
import dotenv from 'dotenv'
import { BungieMembershipType } from 'oodestiny/schemas';

// const [displayName, displayNameCode] = bungieName.split('#');

export function platformToText(platform: number) {
    switch (platform) {
        case BungieMembershipType.TigerXbox:
            return 'xb'
        case BungieMembershipType.TigerPsn:
            return 'ps'
        default:
            return 'pc';
    }
}


