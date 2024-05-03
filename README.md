# Traffic Lights Node.js simulator

## About

The idea of this project is to experiment on how to synchronize several traffic lights and make them as foolproof as possible
This component represents a single traffic light and you can have many of them by running it from many terminals

## Running it

*Use Node 20*

$> npm i
$> node index.js <name> <port>

eg:
$> node index.js NORTH 3000

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
