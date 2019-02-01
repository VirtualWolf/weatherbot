const net = require('net');
const tls = require('tls');
const fetch = require('node-fetch');

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

        this.client.on('close', function() {
            console.log(`Connection to ${this.host} closed`);
        });
    }

    sendInitialConnectionMessages() {
        this.sendMessage({type: 'NICK', message: this.nick});
        this.sendMessage({type: 'USER', message: `${this.nick} 0 * :${this.nick}`});
        console.log(`Connected to ${this.host}:${this.port}`);

        this.joinChannels();
    }

    joinChannels() {
        this.channels.forEach(channel => {
            const key = channel.key
                ? ' ' + channel.key
                : '';

            this.sendMessage({type: 'JOIN', message: `${channel.name}${key}`});
            console.log(`Joined ${channel.name}`);
        });
    }

    sendMessage({type = 'PRIVMSG', messageTarget = '', message}) {
        this.client.write(`${type} ${messageTarget} ${message}\n`);
    }

    async parseMessage({data}) {
        if (data.match(/^PING/)) {
            const [messageType, pingTarget] = data.split(' ');
            this.handlePing({pingTarget});

            return;
        }

        if (data.match(/PRIVMSG/)) {
            const [messageSource, messageType, messageTarget, messageText] = data.split(' ');
            await this.handlePrivMsg({
                messageSource, messageTarget, messageText,
            });

            return;
        }
    }

    handlePing({pingTarget}) {
        this.sendMessage({
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
