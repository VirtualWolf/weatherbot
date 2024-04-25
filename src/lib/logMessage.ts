import * as moment from 'moment';

const timestampFormat = 'YYYY-MM-DD HH:mm:ss.SSS';

export function logMessage(level: 'ERROR' | 'INFO' | 'DEBUG', host: string, message: string) {
    const timestamp = moment().format(timestampFormat);
    const loggedMessage = `[${timestamp}] [${host}] [${level}] ${message.trim()}`;

    if (level === 'DEBUG') {
        process.env.DEBUG ? console.log(loggedMessage) : null;
    } else {
        console.log(loggedMessage);
    }
}

export function log(message: string, level?: 'ERROR' | 'INFO' | 'DEBUG') {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');

    const loggedMessage = `[${timestamp}] [${level}] ${message}`;

    if (level === 'DEBUG') {
        process.env.DEBUG ? console.log(loggedMessage) : null;
    } else {
        console.log(loggedMessage);
    }
}
