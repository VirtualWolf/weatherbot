import * as net from 'net';
import * as tls from 'tls';
import { weatherListener } from './listeners/weather';
import { tootListener } from './listeners/toot';
import { logMessage } from './logMessage';

interface Channel {
    name: string;
    key?: string;
    disableListeners?: string[];
}

interface Channels extends Array<Channel> {}

export default class WeatherBot {
    private host: string;
    private port: number;
    private tlsEnabled: boolean;
    private nick: string;
    private channels: Channels;
    private client: net.Socket | tls.TLSSocket

    constructor({host, port, tlsEnabled, nick, channels}: {host: string, port: number, tlsEnabled: boolean, nick: string, channels: Channels}) {
        this.host = host;
        this.port = port
            ? port
            : tlsEnabled
                ? 6697
                : 6667;
        this.tlsEnabled = tlsEnabled;
        this.nick = nick;
        this.channels = channels;

        this.client = this.tlsEnabled
            ? tls.connect({host: this.host, port: this.port, timeout: 180000}, () => this.sendClientRegistration())
            : net.connect({host: this.host, port: this.port, timeout: 180000}, () => this.sendClientRegistration());

        this.client.on('data', async (buffer: Buffer) => {
            await this.parseMessage(buffer.toString());
        });

        this.client.on('timeout', () => {
            logMessage('INFO', this.host, `Connection to ${host} timed out`);
            this.client.end();
        });

        this.client.on('error', (e) => {
            logMessage('ERROR', this.host, `${e}`);
        });

        this.client.on('close', (hadError) => {
            logMessage('INFO', this.host, `Connection to ${host} closed`);

            try {
                setTimeout(() => this.client.connect({host: this.host, port: this.port}, () => this.sendClientRegistration()), 60000);
            } catch (err) {
                logMessage('INFO', this.host, `Failed to reconnect to ${this.host}`);
            }
        });
    }

    sendClientRegistration() {
        // https://modern.ircdocs.horse/#nick-message
        this.sendMessage({
            type: 'NICK',
            message: this.nick,
        });

        // https://modern.ircdocs.horse/#user-message
        this.sendMessage({
            type: 'USER',
            message: `${this.nick} 0 * :${this.nick}`,
        });

        logMessage('INFO', this.host, `Connected to ${this.host}:${this.port}`);
    }

    async parseMessage(data: string) {
        logMessage('DEBUG', this.host, `Received message: ${data}`);

        // https://modern.ircdocs.horse/#client-to-server-protocol-structure
        const lines = data.split(/\r\n|\r|\n/).filter((line: string) => line !== '');

        for (const line of lines) {
            logMessage('DEBUG', this.host, `Processing line: ${line}`);

            // https://tools.ietf.org/html/rfc1459#section-4.6.2
            if (line.match(/^PING/)) {
                const [messageType, pingTarget] = line.split(' ');

                this.handlePing(pingTarget);
            }

            const split = line.split(' ');
            const [messageSource, messageType, messageTarget] = split;
            const messageText = split.slice(3).join(' ');

            // https://modern.ircdocs.horse/#rplwelcome-001
            if (messageType === '001') {
                this.channels.forEach(async channel => {
                    this.joinChannel(channel.name, channel.key);
                });
            }

            // https://modern.ircdocs.horse/#privmsg-message
            if (messageType === 'PRIVMSG') {
                await this.handlePrivMsg(messageSource, messageTarget, messageText);
            }

            if (messageType === 'KICK') {
                logMessage('INFO', this.host, `Kicked from ${messageTarget}, rejoining in 10 seconds...`);

                const thisChannel = this.channels.find(c => c.name === messageTarget);

                setTimeout(() => this.joinChannel(messageTarget, thisChannel!.key), 10000);
            }
        }
    }

    joinChannel(name: string, key?: string) {
        // https://modern.ircdocs.horse/#join-message
        this.sendMessage({
            type: 'JOIN',
            message: `${name}${key ? ' ' + key : ''}`,
        });

        logMessage('INFO', this.host, `Joined ${name}`);
    }

    handlePing(pingTarget: string) {
        // https://tools.ietf.org/html/rfc2812#section-3.7.3
        this.sendMessage({
            type: 'PONG',
            message: pingTarget.slice(1),
        });
    }

    async handlePrivMsg(messageSource: string, messageTarget: string, messageText: string) {
        const channelSettings = this.channels.find((channel) => messageTarget === channel.name);

        // First check to see if each listener has been disabled in config.json, then run it if not.
        const responses = await Promise.all([
            !channelSettings?.disableListeners?.includes('weather')
                ? weatherListener(messageText, this.nick)
                : null,
            !channelSettings?.disableListeners?.includes('toot')
                ? tootListener(messageText)
                : null,
        ]);

        for (const response of responses) {
            if (!response) {
                continue;
            }

            for (const line of response) {
                this.sendMessage({
                    messageTarget,
                    message: ':' + line,
                });
            }
        }
    }

    sendMessage({type = 'PRIVMSG', messageTarget = '', message}: {type?: string, messageTarget?: string, message?: string}) {
        if (!message) {
            return;
        }

        const rawMessage = `${type} ${messageTarget} ${message}`;

        logMessage('DEBUG', this.host, `Sending message: ${rawMessage}`);

        this.client.write(`${rawMessage}\r\n`, () => logMessage('DEBUG', this.host, `Message successfully sent: ${rawMessage}`));
    }
};
