import fetch from 'node-fetch';

export async function weatherListener(messageText: string, botName: string) {
    const regexp = new RegExp(`${botName}: weather`);

    if (messageText.match(regexp)) {
        return [
            await generateWeatherMessage('outdoor'),
            await generateWeatherMessage('indoor')
        ];
    } else {
        return [];
    }
}

const generateWeatherMessage = async (location: string) => {
    try {
        const prettyLocation = location.charAt(0).toUpperCase() + location.slice(1);

        const res = await fetch(`https://virtualwolf.org/rest/weather/locations/${location}`);
        const { temperature, humidity } = await res.json();

        return `${prettyLocation}: ${temperature}˚ & ${humidity}%`;
    } catch (err) {
        return `Error retrieving date for ${location}: ${err.message}`;
    }
}
