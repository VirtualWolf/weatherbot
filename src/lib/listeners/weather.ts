import fetch from 'node-fetch';
const config = require(process.argv[2] || '../../../config.json');

interface Location {
    name: string;
    url: string;
}

interface WeatherData {
    temperature: number;
    humidity: number;
}

export async function weatherListener(messageText: string, botName: string) {
    const regexp = new RegExp(`${botName}: weather`);

    if (messageText.match(regexp)) {
        return Promise.all(
            config.weather.map(async (location: Location) => await generateWeatherMessage(location))
        );
    } else {
        return [];
    }
}

const generateWeatherMessage = async ({name, url}: {name: string, url: string}) => {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Status was ${res.status}`);
        }

        const json = (await res.json()) as WeatherData;

        if (json.temperature && json.humidity) {
            return `${name}: ${json.temperature}˚ & ${json.humidity}%`;
        } else {
            throw new Error(`Temperature or humidity values not found. Got: ${JSON.stringify(json)}`);
        }
    } catch (err) {
        return `Error retrieving date for ${url}: ${err.message}`;
    }
}
