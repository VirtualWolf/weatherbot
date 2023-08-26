# weatherbot
An IRC bot written without any IRC library, to read temperatures and fetch the text of Mastodon toots. Primarily a learning experience to play with the IRC protocol.

```
10:01 <@virtualwolf> weatherbot: weather
10:01 < weatherbot> Outdoor: 18.8˚ & 60%
10:02 <@virtualwolf> https://aus.social/@virtualwolf/107142233345319503
10:02 < weatherbot> > Beanie is very pooped out after his walk.
10:02 < weatherbot> > https://mediacdn.aus.social/media_attachments/files/107/142/233/323/259/793/original/2156d87b7f910b82.jpeg
```

## Configuration

Requires a file called `config.json` at the root of the repository with the following format to specify an IRC server and a list of channels to join, and optionally a list of HTTP endpoints to fetch weather data from:
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
            "name": "Outdoor",
            "url": "https://example.com/rest/weather/locations/outdoor"
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

Additional options can be specified to use a server password or join a private or secret channel, as well as enabling TLS and changing the port number, and disabling the weather, Mastodon toot, or restart listeners:

```json
{
    "connections": [
        {
            "host": "irc.example.com",
            "tlsEnabled": true,
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
    ],
    "weather": [
        {
            "name": "Outdoor",
            "url": "https://example.com/weather/locations/outdoor"
        },
        {
            "name": "Indoor",
            "url": "https://example.com/weather/locations/indoor"
        }
    ]
}
```

## Running
1. Build the Docker image with `docker-compose build .`
2. Start it with `docker-compose up -d`
