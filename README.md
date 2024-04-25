# weatherbot
An IRC bot written without any IRC library, to read weather data from one or more HTTP endpoints, or to read arbitrary data from one or more MQTT topics, and fetch the text of Mastodon toots. Primarily a learning experience to play with the IRC protocol.

```
10:01 <@virtualwolf> weatherbot: weather
10:01 < weatherbot> The current outdoor temperature is 20.3°C, humidity is 51%
10:03 <@virtualwolf> https://aus.social/@virtualwolf/107142233345319503
10:03 < weatherbot> > Beanie is very pooped out after his walk.
10:03 < weatherbot> > https://mediacdn.aus.social/media_attachments/files/107/142/233/323/259/793/original/2156d87b7f910b82.jpeg
```

# Configuration

Requires a file called `config.json` at the root of the repository with the following format to specify an IRC server and a list of channels to join, and optionally a list of HTTP endpoints to fetch weather data from plus an [EJS](https://ejs.co) template string to render and optionally format the data:

```json
{
    "connections": [
        {
            "host": "irc.example.com",
            "channels": [
                {
                    "name": "#public-channel"
                }
            ]
        }
    ],
    "weather": [
        {
            "url": "https://example.com/rest/weather/locations/outdoor",
            "template": "The current outdoor temperature is <%= temperature %>°C, humidity is <%= humidity %>%"
        }
    ]
}
```

By default, TLS is not enabled and the bot will try to connect on port 6667.

The bot expects the weather URL(s) to return their data in the following format:

```json
{
    "temperature": 18.8,
    "humidity": 60
}
```

Additional options can be specified to use a server password or join a private or secret channel, as well as enabling TLS, not verifying self-signed certificates, changing the port number, and disabling the weather, Mastodon toot, or restart listeners:

```json
{
    "connections": [
        {
            "host": "irc.example.com",
            "tlsEnabled": true,
            "rejectAuthorized": false,
            "port": 6697,
            "serverPassword": "my-very-secure-password",
            "nick": "my-cool-bot",
            "channels": [
                {
                    "name": "#public-channel"
                },
                {
                    "name": "#secret-channel",
                    "key": "hunter2",
                    "disableListeners": ["toot", "weather", "restart"]
                }
            ]
        }
    ]
}
```

# MQTT

You can also have the bot connect to an MQTT broker to read data from an arbitrary topic or set of topics, and render the data appropriately. [EJS](https://ejs.co) is used instead of [Mustache](https://mustache.github.io) so the MQTT data can be reformatted as necessary.

Update `config.json` to include an `mqtt` block (the port defaults to 1883 if not specified):

```json
{
    "connections": [...],
    "mqtt": {
        "brokerAddress": "mqtt.example.com",
        "brokerPort": 1883,
        "dataTypes": {
            "weather": [
                {
                    "topic": "home/outdoor/weather",
                    "template": "Outdoor: <%= temperature.toFixed(1) %>°C & <%= Math.round(humidity) %>% humidity. Dew point is <%= dew_point.toFixed(1) %>°C. Atmospheric pressure is <%= Math.round(pressure) %> hPa."
                },
                {
                    "topic": "home/indoor/weather",
                    "template": "Indoor: <%= temperature.toFixed(1) %>°C & <%= Math.round(humidity) %>% humidity."
                }
            ],
            "power": [
                {
                    "topic": "home/power",
                    "template": "Consumption is <%= (home_usage/1000).toFixed(2) %>kW, solar generation is <%= solar_generation === 0 ? solar_generation : (solar_generation/1000).toFixed(2) %>kW. Current battery charge is <%= battery_charge_percentage === 100 ? battery_charge_percentage : battery_charge_percentage.toFixed(1) %>%."
                }
            ],
            "airquality": [
                {
                    "topic": "home/outdoor/airquality",
                    "template": "Outdoor: PM1.0 is <%= pm_1_0 %>, PM2.5 is <%= pm_2_5 %>, PM10 is <%= pm_10 %>."
                }
            ]
        }
    },
}
```

The bot will respond to the name of the `dataType` key, so in the example above, `weather`, `power`, and `airquality`:

```
10:04 <@virtualwolf> weatherbot: weather
10:04 < weatherbot> Outdoor: 20.6°C & 47% humidity. Dew point is 9.3°C. Atmospheric pressure is 1016 hPa.
10:04 < weatherbot> Indoor: 21.7°C & 42% humidity.
10:04 <@virtualwolf> weatherbot: airquality
10:04 < weatherbot> Outdoor: PM1.0 is 1, PM2.5 is 3, PM10 is 4.
10:04 <@virtualwolf> weatherbot: power
10:04 < weatherbot> Consumption is 1.19kW, solar generation is 4.45kW. Current battery charge is 100%.
```

If the `weather` key exists as a top-level configuration key _and_ in the `mqtt` block, the MQTT block will take precedence.

# Running

Build the container and start it with `docker compose up --build -d`
