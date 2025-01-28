import { render } from 'ejs';
import { dataTypes, mqttData } from "../mqtt";

export async function mqttListener(messageText: string, botName: string) {
    const regexp = new RegExp(`^:${botName}: (${dataTypes.join('|')})`, 'g');
    const [...matches] = messageText.matchAll(regexp)

    if (matches.length !== 0) {
        const renderedOutput: string[] = [];

        const dataType = matches[0][1];

        mqttData[dataType].forEach(topicItem => {
            renderedOutput.push(render(topicItem.template, topicItem.data));
        });

        return renderedOutput;
    } else {
        return [];
    }
}
