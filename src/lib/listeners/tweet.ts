import fetch from 'node-fetch';
const config = require(process.argv[2] || '../../../config.json');

interface Media {
    media_key: string;
    type: 'photo' | 'video';
    url?: string;
}

interface Error {
    detail: string;
}

interface Tweet {
    data: {
        text: string;
    };
    includes?: {
        media: Media[];
    }
    errors?: Error[];
}

export async function tweetListener(messageText: string) {
    const tweet = messageText.match(/https:\/\/twitter\.com\/(?:[A-Za-z0-9_]+)\/status\/(\d+)/);

    if (tweet && config.twitterBearerToken) {
        const tweetId = tweet[1];

        try {
            const res = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys&media.fields=url`, {
                headers: {
                    'Authorization': `Bearer ${config.twitterBearerToken}`
                },
            });

            if (!res.ok) {
                throw new Error(`Received status ${res.status}`);
            }

            const json: Tweet = await res.json();

            if (json.errors) {
                throw new Error(json.errors[0].detail);
            }

            const tweetArray: string[] = json.data.text.split('\n');

            if (json.includes?.media) {
                json.includes.media.forEach((item: Media) => {
                    if (item.url) {
                        tweetArray.push(item.url);
                    }
                });
            }

            return tweetArray
                .filter(item => item !== '')
                .map(item => `> ${item}`);
        } catch (err) {
            return ['Error retrieving tweet: ' + err.message];
        }
    }
}
