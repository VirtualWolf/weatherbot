# weatherbot
An IRC bot written without any IRC library, to read temperatures, fetch the text of Mastodon toots, and the text of tweets. Primarily a learning experience to play with the IRC protocol.

```
18:58 <@virtualwolf> weatherbot: weather
18:58 < weatherbot> Outdoor: 18.8˚ & 60%
18:58 <@virtualwolf> https://aus.social/@virtualwolf/107142233345319503
18:58 < weatherbot> Beanie is very pooped out after his walk.
18:58 < weatherbot> https://aus.social/media/GuZHQLn5xzmaNy_wxD0
```

## Configuration

Requires a file called `config.json` at the root of the repository with the following format to specify an IRC server and a list of channels to join, and optionally a list of HTTP endpoints to fetch weather data from and a Twitter bearer token from [developer.twitter.com](https://developer.twitter.com) to programtically read tweet details:
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
    ],
    "twitterBearerToken": "AAAAAAAAAAAAAAAAAAAAABJkVwEAAAAAnNIgvTvkRBGW[...]"
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

Additional options can be specified to join a private or secret channel, as well as enabling TLS and changing the port number, and disabling the weather or Mastodon toot listeners:

```json
{
    "connections": [
        {
            "host": "localhost",
            "tlsEnabled": true,
            "port": 6697,
            "nick": "my-cool-bot",
            "channels": [
                {
                    "name": "#public-channel"
                },
                {
                    "name": "#secret-channel",
                    "key": "hunter2",
                    "disableListeners": ["toot", "weather", "tweet"]
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
    ],
    "twitterBearerToken": "AAAAAAAAAAAAAAAAAAAAABJkVwEAAAAAnNIgvTvkRBGW[...]"
}
```

## Running
1. Build the Docker image with `docker-compose build .`
2. Start it with `docker-compose up -d`
