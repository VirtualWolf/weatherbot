import fetch from 'node-fetch';
const config = require(process.argv[2] || '../../../config.json');

interface WeatherData {
    [key: string]: {
        temperature: number;
        humidity: number;
    }
}

export async function weatherListener(messageText: string, botName: string) {
    const regexp = new RegExp(`${botName}: weather`);

    if (messageText.match(regexp)) {
        const messageParts = messageText.split(': weather');

        const location = messageParts[messageParts.length - 1].trim();

        if (config.weather.locations.includes(location)) {
            return await fetchWeatherData(location);
        }

        return await fetchWeatherData();
    } else {
        return [];
    }
}

const fetchWeatherData = async (location?: string) => {
    try {
        const res = await fetch(config.weather.url);

        if (!res.ok) {
            throw new Error(`Status was ${res.status}`);
        }

        const json = (await res.json()) as WeatherData;

        const data: string[] = [];

        Object.keys(json)
            .filter(key => location ? key === location : config.weather.locations.includes(key))
            .map(key => data.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${json[key].temperature}˚ and ${json[key].humidity}%`));

        return data;
    } catch (err) {
        return [`Error retrieving date for ${config.weather.url}: ${err.message}`];
    }
}
