import { connect } from 'mqtt';
import { log } from './logMessage';
const config = require(process.argv[2] || '../../config.json');

interface SingleMqttDataType {
    topic: string;
    template: string;
    data: any;
}

interface MqttData {
    [key: string]: SingleMqttDataType[]
}

export let latestMqttData: MqttData = {}
export const dataTypes: string[] = [];
export let subscribeToBroker: Function;

if (config.mqtt) {
    latestMqttData = config.mqtt.dataTypes;

    Object.keys(config.mqtt.dataTypes).forEach((type: string) => dataTypes.push(type));

    subscribeToBroker = () => {
        const client = connect('tcp://' + config.mqtt.brokerAddress, {
            port: config.mqtt.brokerPort || 1883,
            clientId: 'weatherbot',
        });

        const topics: string[] = [];

        Object.keys(config.mqtt.dataTypes).forEach((type: string) => {
            Object.values(config.mqtt.dataTypes[type]).forEach((type: any) => topics.push(type.topic));
        });

        client.subscribe(topics);

        client.on('message', async (topic, message) => {
            Object.keys(config.mqtt.dataTypes).forEach((type: string) => {
                const matchingDataType = config.mqtt.dataTypes[type]
                    .find((item: any) => item.topic === topic);

                if (matchingDataType) {
                    const index = latestMqttData[type].findIndex(item => item.topic === topic);

                    const json = JSON.parse(message.toString());

                    latestMqttData[type][index].data = json;
                }
            });
        });

        client.on('error', (err) => {
            log(err.message, 'ERROR')
        })
    };
}
