import fetch from 'node-fetch';

export async function weatherListener(messageText: string) {
    if (messageText.match(/^:!weather/)) {
        return [
            await generateWeatherMessage('outdoor'),
            await generateWeatherMessage('indoor')
        ];
    } else {
        return [];
    }
}

const generateWeatherMessage = async (location: string) => {
    const prettyLocation = location.charAt(0).toUpperCase() + location.slice(1);

    const res = await fetch(`https://virtualwolf.org/rest/weather/locations/${location}`);
    const { temperature, humidity } = await res.json();

    return `:${prettyLocation}: ${temperature}˚ & ${humidity}%`;
}