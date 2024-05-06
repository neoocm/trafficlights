# Traffic Lights Node.js simulator

## About

The idea of this project is to experiment on how to synchronize several traffic lights and make them as foolproof as possible
This component represents a single traffic light and you can have many of them by running it from many terminals

## Running it

*Use Node 20*

$> npm i

There are 2 services on for the traffic light one for the server that will coordinate them

$> node index.js <name> <port>
$> node server.js

For example, you can run 2 traffic lights and a server

$> node index.js NORTH 3000
$> node index.js EAST 3001
$> node server.js

Then you can check out the node ids that were generated for them (json files will be created)
And create a proposal for coordinating the traffic lights like the one attached proposal.json
The server will wait for input, when you enter "proposal" it will read the file proposal.json, and submit the new schedule for all the traffic lights in the corner. After that, the traffic lights will be coordinated.
If one fails, an error will show up


## Features

- After turning the light on, detect it is on by using a sensor and fail by blinking all the remaining lights
- Synchronize the phase of the semaphore to a given start date and execution plan of states and timelines
- Allow for remote control of the device
- Power on self-test
- Fallback mechanism when there is no internet connection

## Programming features

- Versatile implementation allowing for several states and icons
- Modular, class based and async design
- Colored output
- Strict integrity checks
- Simple looping and logic to make it easier to port to C++

## Not included

- Watchdog timer that would reboot the device if unresponsive
- Hardware stuff
- NTP sync
