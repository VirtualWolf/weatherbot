import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function tootListener(messageText: string) {
    const toot = messageText.match(/(https:\/\/.*)\/@(?:[A-Za-z0-9_]+)\/(\d+)/);

    if (toot) {
        const url = toot[0];

        try {
            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`Received status ${res.status}`);
            }

            const $ = cheerio.load(await res.text());

            const tootArray: string[] = [];

            const text = $('meta[property=og\\:description]').attr('content')?.split('\n');
            text?.forEach(line => {
                if (!line.match(/^Attached: \d+/)) {
                    tootArray.push(line);
                }
            });

            const attachments = $('meta[property=og\\:image], meta[property=og\\:audio], meta[property=og\\:video]');

            if (attachments.length > 0) {
                attachments.each((index, element) => {
                    const url = $(element).attr('content');

                    if (url) {
                        tootArray.push(url);
                    }
                });
            }

            return tootArray
                .filter(item => item !== '')
                .map(item => `> ${item}`);
        } catch (err) {
            return ['Error retrieving toot: ' + err.message];
        }
    } else {
        return [];
    }
}
