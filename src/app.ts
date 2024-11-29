import { log } from './lib/logMessage';
import { subscribeToBroker } from './lib/mqtt';
import { WeatherBot } from './lib/weatherbot';
const config = require(process.argv[2] || '../config.json');

type Listeners = 'fact' | 'mqtt' | 'restart' | 'url' | 'weather';

export interface Channel {
    name: string;
    key?: string;
    disableListeners?: Listeners[];
}

interface Connection {
    host: string;
    port?: number;
    tlsEnabled?: boolean;
    rejectUnauthorized?: boolean;
    serverPassword?: string;
    nick: string;
    channels: Channel[];
}

config.connections.forEach((c: Connection) => {
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
