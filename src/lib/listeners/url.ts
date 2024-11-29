import * as linkify from "linkifyjs";
import * as cheerio from 'cheerio';
import { log } from "../logMessage";

export async function urlListener(messageText: string) {
    const urls = linkify.find(messageText);

    if (urls.length > 0) {
        let messageArray: string[] = [];

        for (const url of urls) {
            try {
                const res = await fetch(url.href);

                if (!res.ok) {
                    log(`Received status ${res.status} for URL ${url.href}`);

                    return [];
                }

                const $ = cheerio.load(await res.text());

                // Matches for Mastodon URLs like https://horse.example/@user/12345678909 as well as URLs from
                // GoToSocial in the form of https://horse.example/@user/statuses/ABC123
                if (url.href.match(/(https:\/\/.*)\/@(?:[A-Za-z0-9_]+)\/(\d+|statuses\/[A-Z0-9]+)/)) {
                    handleTootUrl($).forEach(line => messageArray.push(line));
                } else {
                    handleGenericUrl($).forEach(line => messageArray.push(line));
                }
            } catch (err) {
                log(err, 'ERROR');
            }
        };

        return messageArray
            .filter(item => item !== '')
            .map(item => `> ${item}`);
    } else {
        return [];
    }
}

function handleTootUrl($: cheerio.Root) {
    const tootArray: string[] = [];

    const text = $('meta[property=og\\:description]').attr('content')?.split('\n');

    text?.filter(line => !line.match(/^Attached: \d+/)).forEach(line => tootArray.push(line));

    extractMedia($).forEach(item => tootArray.push(item));

    return tootArray;
}

function handleGenericUrl($: cheerio.Root) {
    const messageArray: string[] = [];

    const pageTitle = $('meta[property=og\\:title]').attr('content');

    if (pageTitle) {
        messageArray.push( '📖 ' + pageTitle);
    }

    const pageDescription = $('meta[property=og\\:description]').attr('content')?.split('\n');

    pageDescription?.forEach(line => messageArray.push(line));

    extractMedia($).forEach(item => messageArray.push(item));

    return messageArray;
}

function extractMedia($: cheerio.Root) {
    const media = $('meta[property=og\\:image], meta[property=og\\:audio], meta[property=og\\:video]');

    const mediaArray: string[] = [];

    media.each((index, element) => {
        const url = $(element).attr('content');

        if (url) {
            mediaArray.push(url);
        }
    });

    return mediaArray;
}
