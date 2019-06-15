const WeatherBot = require('./lib/weatherbot');
const config = require(process.argv[2] || './config.json');

config.connections.forEach(c => {
    new WeatherBot({
        host: c.host,
        port: c.port,
        tlsEnabled: c.tlsEnabled,
        nick: c.nick || 'weatherbot',
        channels: c.channels,
    });
});
