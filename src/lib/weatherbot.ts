import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { weatherListener } from './listeners/weather';
import { tootListener } from './listeners/toot';
import { logMessage } from './logMessage';

interface Channel {
    name: string;
    key?: string;
}

interface Channels extends Array<Channel> {}

export default class WeatherBot {
    private host: string;
    private port: number;
    private tlsEnabled: boolean;
    private nick: string;
    private channels: Channels;
    private client: Socket | TLSSocket

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
            // @ts-ignore
            ? new TLSSocket()
            : new Socket();

        this.client.connect(this.port, this.host, () => {
            this.sendInitialConnectionMessages();
        });

        this.client.on('data', async (buffer) => {
            const data = buffer.toString();
            await this.parseMessage({data});
        });

        this.client.on('timeout', function() {
            logMessage('ERROR', `Connection to ${host} timed out`);
        });

        this.client.on('error', (e) => {
            logMessage('ERROR', `${e}`);

        });

        this.client.on('close', (hadError) => {
            logMessage('INFO', `Connection to ${host} closed`);
        });
    }

    sendInitialConnectionMessages() {
        this.sendMessage({type: 'NICK', message: this.nick});
        this.sendMessage({type: 'USER', message: `${this.nick} 0 * :${this.nick}`});
        logMessage('INFO', `Connected to ${this.host}:${this.port}`);

        this.joinChannels();
    }

    joinChannels() {
        this.channels.forEach(channel => {
            const key = channel.key
                ? ' ' + channel.key
                : '';

            this.sendMessage({type: 'JOIN', message: `${channel.name}${key}`});
            logMessage('INFO', `Joined ${channel.name}`);
        });
    }

    async parseMessage({data}: {data: string}) {
        logMessage('DEBUG', `Received message: ${data}`);

        const lines = data.split(/\n/).filter((line: string) => line !== '');

        for (const line of lines) {
            logMessage('DEBUG', `Processing line: ${line}`);

            if (line.match(/^PING/)) {
                const [messageType, pingTarget] = line.split(' ');

                await this.handlePing({pingTarget});
            }

            if (line.match(/PRIVMSG/)) {
                const split = line.split(' ');
                const [messageSource, messageType, messageTarget] = split;
                const messageText = split.slice(3).join(' ');

                await this.handlePrivMsg({
                    messageSource, messageTarget, messageText,
                });
            }
        }
    }

    async handlePing({pingTarget}: {pingTarget: string}) {
        await this.sendMessage({
            type: 'PONG',
            message: pingTarget.slice(1),
        });
    }

    async handlePrivMsg({messageSource, messageTarget, messageText}: {messageSource: string, messageTarget: string, messageText: string}) {
        const responses = await Promise.all([
            weatherListener(messageText),
            tootListener(messageText),
        ]);

        for (const response of responses) {
            for (const line of response) {
                this.sendMessage({
                    messageTarget,
                    message: ':' + line,
                });
            }
        }
    }

    async sendMessage({type = 'PRIVMSG', messageTarget = '', message}: {type?: string, messageTarget?: string, message?: string}) {
        if (!message) {
            return;
        }

        logMessage('DEBUG', `Sending message: ${type + ' ' + messageTarget + ' ' + message}`);

        this.client.write(`${type} ${messageTarget} ${message}\n`);
    }
};
