# Real Trap Shit
A multiplayer workplace annoyatron (socket.io-powered multiplayer soundboard)


### Installation
    # clone the repo first, then...
    npm install
    cp config.js.example config.js

### Config
Use the config.json.sample as a demo and edit it for your own purposes.
The "filename" property of each sample should match a .mp3 and an .ogg file in public/samples, ie:

    {
        "name": "haha lol",
        "filename": "lol"
    }

Means you should have `lol.mp3` & `lol.ogg` in your `public/samples` folder.

### Usage
    node app.js
    # default port is 4000

You can also build and run a Docker container:

    docker build -t realtrapshit .
    docker run -d -p 5000:5000 realtrapshit
