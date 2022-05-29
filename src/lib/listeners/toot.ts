import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function tootListener(messageText: string) {
    const toot = messageText.match(/(https:\/\/.*)\/@(?:[A-Za-z0-9_]+)\/(\d+)/);

    if (toot) {
        const mastodonInstanceUrl = toot[1];
        const statusId = toot[2];

        try {
            const res = await fetch(`${mastodonInstanceUrl}/api/v1/statuses/${statusId}`);

            if (!res.ok) {
                throw new Error(`Received status ${res.status}`);
            }

            const json = await res.json();

            if (json.error) {
                throw new Error(json.error);
            }

            const $ = cheerio.load(json.content);
            $('p').prepend('\n');
            $('br').prepend('\n');

            const tootArray = $('p').text().split('\n');

            if (json.media_attachments) {
                for (const attachment of json.media_attachments) {
                    tootArray.push(attachment.text_url);
                }
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
