const net = require('net');
const tls = require('tls');
const fetch = require('node-fetch');
const moment = require('moment');

module.exports = class WeatherBot {
    constructor({host, port, tlsEnabled, nick, channels}) {
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
            ? new tls.TLSSocket()
            : new net.Socket();

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

    async sendMessage({type = 'PRIVMSG', messageTarget = '', message}) {
        logMessage('DEBUG', `Sending message: ${type + ' ' + messageTarget + ' ' + message}`);

        this.client.write(`${type} ${messageTarget} ${message}\n`);
    }

    async parseMessage({data}) {
        logMessage('DEBUG', `Received message: ${data}`);

        const lines = data.split(/\n/).filter(line => line !== '');

        for (const line of lines) {
            logMessage('DEBUG', `Processing line: ${line}`);

            if (line.match(/^PING/)) {
                const [messageType, pingTarget] = line.split(' ');

                await this.handlePing({pingTarget});
            }

            if (line.match(/PRIVMSG/)) {
                const [messageSource, messageType, messageTarget, messageText] = line.split(' ');

                await this.handlePrivMsg({
                    messageSource, messageTarget, messageText,
                });
            }
        }
    }

    async handlePing({pingTarget}) {
        await this.sendMessage({
            type: 'PONG',
            message: pingTarget.slice(1),
        });
    }

    async handlePrivMsg({messageSource, messageTarget, messageText}) {
        if (messageText.match(/^:!weather/)) {
            await this.getWeather({
                location: 'outdoor',
                messageTarget,
            });

            await this.getWeather({
                location: 'indoor',
                messageTarget,
            });
        }
    }

    async getWeather({location, messageTarget}) {
        const prettyLocation = location.charAt(0).toUpperCase() + location.slice(1);

        const res = await fetch(`https://virtualwolf.org/rest/weather/locations/${location}`);
        const json = await res.json();

        this.sendMessage({
            messageTarget,
            message: `:${prettyLocation}: ${json.temperature}˚ & ${json.humidity}%`,
        });
    }
};

function logMessage(level, message) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    const loggedMessage = `[${timestamp}] [${level}] ${message.trim()}`;

    if (level === 'DEBUG') {
        process.env.DEBUG ? console.log(loggedMessage) : null;
    } else {
        console.log(loggedMessage);
    }
}
