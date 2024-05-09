import * as net from 'net';
import * as tls from 'tls';
import { weatherListener } from './listeners/weather';
import { mqttListener } from './listeners/mqtt';
import { dataTypes } from './mqtt';
import { tootListener } from './listeners/toot';
import { factListener } from './listeners/fact';
import { restartListener } from './listeners/restart';
import { logMessage } from './logMessage';
const config = require(process.argv[2] || '../../config.json');

interface Channel {
    name: string;
    key?: string;
    disableListeners?: string[];
}

interface Channels extends Array<Channel> {}

enum ClientMessage {
    USER = 'USER',
    PASS = 'PASS',
    NICK = 'NICK',
    JOIN = 'JOIN',
    PONG = 'PONG',
    PRIVMSG = 'PRIVMSG',
}

enum ServerMessage {
    RPL_WELCOME = '001',
    ERR_NICKNAMEINUSE = '433',
    PING = 'PING',
    PRIVMSG = 'PRIVMSG',
    KICK = 'KICK',
}

export default class WeatherBot {
    private host: string;
    private port: number;
    private tlsEnabled: boolean;
    private rejectUnauthorized: boolean;
    private serverPassword: string;
    private nick: string;
    private channels: Channels;
    private client: net.Socket | tls.TLSSocket

    constructor({host, port, tlsEnabled, rejectUnauthorized = true, serverPassword, nick, channels}: {host: string, port: number, tlsEnabled: boolean, rejectUnauthorized: boolean, serverPassword: string, nick: string, channels: Channels}) {
        this.host = host;
        this.port = port
            ? port
            : tlsEnabled
                ? 6697
                : 6667;
        this.tlsEnabled = tlsEnabled;
        this.rejectUnauthorized = rejectUnauthorized;
        this.serverPassword = serverPassword;
        this.nick = nick;
        this.channels = channels;

        this.client = this.tlsEnabled
            ? tls.connect({host: this.host, port: this.port, rejectUnauthorized: this.rejectUnauthorized, timeout: 180000}, () => this.sendClientRegistration())
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
        if (this.serverPassword) {
            this.sendMessage({
                type: ClientMessage.PASS,
                message: this.serverPassword,
            });
        }

        // https://modern.ircdocs.horse/#nick-message
        this.sendMessage({
            type: ClientMessage.NICK,
            message: this.nick,
        });

        // https://modern.ircdocs.horse/#user-message
        this.sendMessage({
            type: ClientMessage.USER,
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

            // The welcome message sent by the server after client registration
            // https://modern.ircdocs.horse/#rplwelcome-001
            if (messageType === ServerMessage.RPL_WELCOME) {
                logMessage('INFO', this.host, messageText);

                this.channels.forEach(async channel => {
                    this.joinChannel(channel.name, channel.key);
                });
            }

            // Returned when the bot tries to use a nickname that is already being used by someone
            // https://modern.ircdocs.horse/#errnicknameinuse-433
            if (messageType === ServerMessage.ERR_NICKNAMEINUSE) {
                const originalNick = this.nick;
                const newNick = `${this.nick}_`

                logMessage('INFO', this.host, `Nickname "${this.nick}" already in use, temporarily changing nickname to ${newNick}`)

                this.nick = newNick;

                setTimeout(() => {
                    logMessage('INFO', this.host, `Attempting to set nickname back to ${originalNick}...`)

                    this.sendMessage({
                        type: ClientMessage.NICK,
                        message: originalNick,
                    });

                    this.nick = originalNick;
                }, 180000);
            }

            // https://modern.ircdocs.horse/#privmsg-message
            if (messageType === ServerMessage.PRIVMSG) {
                await this.handlePrivMsg(messageSource, messageTarget, messageText);
            }

            if (messageType === ServerMessage.KICK) {
                logMessage('INFO', this.host, messageText);

                const thisChannel = this.channels.find(c => c.name === messageTarget);

                setTimeout(() => this.joinChannel(messageTarget, thisChannel?.key), 10000);
            }
        }
    }

    joinChannel(name: string, key?: string) {
        // https://modern.ircdocs.horse/#join-message
        this.sendMessage({
            type: ClientMessage.JOIN,
            message: `${name}${key ? ' ' + key : ''}`,
        });

        logMessage('INFO', this.host, `Joined ${name}`);
    }

    handlePing(pingTarget: string) {
        // https://tools.ietf.org/html/rfc2812#section-3.7.3
        this.sendMessage({
            type: ClientMessage.PONG,
            message: pingTarget.slice(1),
        });
    }

    async handlePrivMsg(messageSource: string, messageTarget: string, messageText: string) {
        const channelSettings = this.channels.find((channel) => messageTarget === channel.name);

        try {
            // First check to see if each listener has been disabled in config.json, then run it if not.
            const responses = await Promise.all([
                channelSettings?.disableListeners?.includes('restart')
                    ? null
                    : restartListener(messageText, this.nick),
                channelSettings?.disableListeners?.includes('weather') || dataTypes.includes('weather')
                    ? null
                    : weatherListener(messageText, this.nick),
                channelSettings?.disableListeners?.includes('mqtt') && config.mqtt
                    ? null
                    : mqttListener(messageText, this.nick),
                channelSettings?.disableListeners?.includes('toot')
                    ? null
                    : tootListener(messageText),
                channelSettings?.disableListeners?.includes('fact')
                    ? null
                    : factListener(messageText, this.nick),
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
        } catch (err) {
            this.sendMessage({
                messageTarget,
                message: ':' + 'Something went wrong: ' + err,
            })
        }
    }

    sendMessage({type = ClientMessage.PRIVMSG, messageTarget = '', message}: {type?: ClientMessage, messageTarget?: string, message?: string}) {
        if (!message) {
            return;
        }

        const rawMessage = `${type} ${messageTarget} ${message}`;

        logMessage('DEBUG', this.host, `Sending message: ${rawMessage}`);

        this.client.write(`${rawMessage}\r\n`, () => logMessage('DEBUG', this.host, `Message successfully sent: ${rawMessage}`));
    }
};
