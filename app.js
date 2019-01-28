const net = require('net');
const tls = require('tls');
const fetch = require('node-fetch');

const client = process.env.TLS === 'true'
    ? new tls.TLSSocket()
    : new net.Socket();

client.connect(process.env.PORT, process.env.HOST, function() {
    console.log('CONNECTED TO: ' + process.env.PORT + ':' + process.env.HOST);

    sendMessage({type: 'NICK', message: 'weatherbot'});
    sendMessage({type: 'USER', message: 'weatherbot 0 * :weatherbot'});
    sendMessage({type: 'JOIN', message: `${process.env.CHANNEL}${process.env.CHANNEL_KEY ? ' ' + process.env.CHANNEL_KEY : ''}`});
});

client.on('data', async (buffer) => {
    const data = buffer.toString();

    console.log('RAW DATA: ' + data);

    await parseMessage({data});
});

client.on('close', function() {
    console.log('Connection closed.');
});

async function parseMessage({data}) {
    if (data.match(/^PING/)) {
        const [messageType, pingTarget] = data.split(' ');

        handlePing({pingTarget});

        return;
    }

    if (data.match(/PRIVMSG/)) {
        const [messageSource, messageType, messageTarget, messageText] = data.split(' ');

        await handlePrivMsg({
            messageSource, messageTarget, messageText,
        });

        return;
    }
}

function handlePing({pingTarget}) {
    sendMessage({
        type: 'PONG',
        message: pingTarget.slice(1),
    });
}

async function handlePrivMsg({messageSource, messageTarget, messageText}) {
    if (messageText.match(/^:!weather/)) {
        await getWeather({
            location: 'outdoor',
            messageTarget,
        });

        await getWeather({
            location: 'indoor',
            messageTarget,
        });
    }
}

function sendMessage({type = 'PRIVMSG', messageTarget = '', message}) {
    client.write(`${type} ${messageTarget} ${message}\n`);
}

async function getWeather({location, messageTarget}) {
    const prettyLocation = location.charAt(0).toUpperCase() + location.slice(1);

    const res = await fetch(`https://virtualwolf.org/rest/weather/locations/${location}`);
    const json = await res.json();

    sendMessage({
        messageTarget,
        message: `:→ ${prettyLocation}: ${json.temperature}˚ & ${json.humidity}%`,
    });
}