import WeatherBot from './lib/weatherbot';
const config = require(process.argv[2] || '../config.json');

config.connections.forEach((c: any) => {
    new WeatherBot({
        host: c.host,
        port: c.port,
        tlsEnabled: c.tlsEnabled,
        serverPassword: c.password,
        nick: c.nick || 'weatherbot',
        channels: c.channels,
    });
});
