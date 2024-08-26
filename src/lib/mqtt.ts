import { connect } from 'mqtt';
import { log } from './logMessage';
const config = require(process.argv[2] || '../../config.json');

interface SingleMqttDataType {
    topic: string;
    template: string;
    data?: any;
}

interface MqttData {
    [key: string]: SingleMqttDataType[]
}

export let mqttData: MqttData = {}
export const dataTypes: string[] = [];
export let subscribeToBroker: Function;

if (config.mqtt) {
    mqttData = config.mqtt.dataTypes;

    Object.keys(mqttData).forEach((type: string) => dataTypes.push(type));

    subscribeToBroker = () => {
        const client = connect('tcp://' + config.mqtt.brokerAddress, {
            port: config.mqtt.brokerPort || 1883,
            clientId: 'weatherbot',
        });

        const topics: string[] = [];

        dataTypes.forEach(type => Object.values(mqttData[type]).forEach(type => topics.push(type.topic)));

        client.subscribe(topics);

        client.on('message', async (topic, message) => {
            dataTypes.forEach(dataType => {
                const dataTypeIndex = mqttData[dataType].findIndex((item) => item.topic === topic);

                if (dataTypeIndex !== -1) {
                    try {
                        const json = JSON.parse(message.toString());

                        // Merge the existing data together with the new data, to handle the case where two
                        // different types of data are being emitted on the same topic with different fields
                        mqttData[dataType][dataTypeIndex].data = {
                            ...mqttData[dataType][dataTypeIndex].data,
                            ...json,
                        };
                    } catch (err) {
                        log(`Error processing message "${message.toString()}" from topic ${topic}. Error was: ${err}`, 'ERROR')
                    }
                }
            });
        });

        client.on('error', (err) => {
            log(err.message, 'ERROR')
        })
    };
}
