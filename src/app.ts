import { log } from './lib/logMessage';
import { subscribeToBroker } from './lib/mqtt';
import WeatherBot from './lib/weatherbot';
const config = require(process.argv[2] || '../config.json');

config.connections.forEach((c: any) => {
    new WeatherBot({
        host: c.host,
        port: c.port,
        tlsEnabled: c.tlsEnabled,
        rejectUnauthorized: c.rejectUnauthorized,
        serverPassword: c.serverPassword,
        nick: c.nick || 'weatherbot',
        channels: c.channels,
    });
});

if (config.mqtt) {
    subscribeToBroker();
}

function handleSignal(signal: string) {
    log(`Received signal ${signal}`, 'INFO');

    process.exit();
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);
