import * as moment from 'moment';

export function logMessage(level: string, message: string) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    const loggedMessage = `[${timestamp}] [${level}] ${message.trim()}`;
    if (level === 'DEBUG') {
        process.env.DEBUG ? console.log(loggedMessage) : null;
    }
    else {
        console.log(loggedMessage);
    }
}
