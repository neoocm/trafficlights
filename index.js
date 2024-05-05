const P = require('./persistence.js');
const Util = require('./util.js');
const STL = require('./simpleTrafficLights.js');
const express = require('express');
const https = require('http');
const dns = require('dns');

const HEARTBEAT_PERIOD = 10000;
const COMMIT_TIMEOUT = 100000;
const RETRY_INTERNET_PERIOD = 5000;
const SERVER_HOST = 'localhost';
const SERVER_PORT = 9000;
const SERVER_PATH = '/heartbeat';

///////////////// PARSE ARGUMENTS /////////////////////

const args = process.argv;
// Check if the appropriate number of arguments is provided
if (args.length < 4) {
	console.log('Usage: node index.js "Traffic Light Name" port');
	process.exit(1);
}
// Extract the first argument as name
const name = args[2];
if(typeof name != 'string' || name.length == 0)
{
	console.log('Assign a reference name for this traffic light.');
	process.exit(1);
}
// Extract the second argument as port and convert to integer
const PORT = parseInt(args[3], 10);
// Validate the port to ensure it's a positive integer
if (isNaN(PORT) || PORT <= 0) {
	console.log('The port must be a positive integer.');
	process.exit(1);
}



////////////////// FUNCTIONS ////////////////////////

function startServer(stl, PORT)
{
	const app = express();
	app.use(express.json());

	app.post('/propose', (req, res) => {
		
		// write a 2 step consensus algorithm that will receive data to be saved in the traffic light and reply ok, then wait for the commit, if after 100000 seconds it does not receive the commit, die

		// 1. Parse the raw body of the request
		let dataPropose = req.body;
		if(!dataPropose)
		{
			res.status(400).send('No data received');
			return;
		}
		
		console.log('Received data, sending OK', dataPropose.states);
		//console.log(data);
		if (dataPropose.configTimes && !stl.validate(dataPropose.startingTime, dataPropose.configTimes, 0))
		{
			return res.status(400).send('Bad Request');
		}
		if (dataPropose.baseTimes && !stl.validate(dataPropose.startingTime, dataPropose.baseTimes, 1, dataPropose.states))
		{
			return res.status(400).send('Bad Request');
		}

		P.append(stl.name, {proposed: dataPropose});

		if(stl.commitTimeout)
		{
			clearTimeout(stl.commitTimeout);
		}
		stl.commitTimeout = setTimeout(()=>{
			// If no commit is received, failure
			Util.raiseError({
				light: stl
			,	errorMessage: `No commit received after 100000 seconds`
			});
		}, COMMIT_TIMEOUT);

		res.status(200).send('OK');
	});

	app.post('/commit', (req, res) => {

		var dataCommit = req.body;
		if(!dataCommit)
		{
			res.status(400).send('No data received');
			return;
		}

		if (dataCommit.configTimes && !stl.validate(dataCommit.startingTime, dataCommit.configTimes, 0))
		{
			return res.status(400).send('Bad Request');
		}
		if (dataCommit.baseTimes && !stl.validate(dataCommit.startingTime, dataCommit.baseTimes, 1, dataCommit.states))
		{
			return res.status(400).send('Bad Request');
		}

		let readData = P.read(stl.name);
		readData.committed = readData.proposed;
		delete readData.proposed;
		P.write(stl.name, readData);
		
		clearTimeout(stl.commitTimeout);
		res.status(200).send('OK');
	});

	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
}


////////////////// MAIN SEQUENCE ////////////////////////



let stl = new STL(name);
process.on('uncaughtException', e=>{
	console.log('--------------------------------------------------------> FAILED!');
	console.log(e);
	setTimeout(()=>{
		stl.blinkAll();
	},500);
});

async function checkInternet() {
	return new Promise((resolve, reject) => {
		dns.resolve('www.google.com', (err) => {
			if (err) {
				console.log("No internet connection.");
				resolve(false);
			} else {
				console.log("Internet is connected.");
				resolve(true);
			}
		});
	});
}

async function ensureInternetAndHeartbeat() {
	if (!(await checkInternet())) {
		// Retry after 5 seconds if not connected
		setTimeout(ensureInternetAndHeartbeat, RETRY_INTERNET_PERIOD);
	} else {
		// Send heartbeat when connected
		let heartbeatInterval = setInterval(async () => {
			
			console.log("Sending heartbeat...");

			let data = stl.toJSON();
			data.port = PORT;
			const postData = JSON.stringify(data);

			const options = {
				hostname: SERVER_HOST,
				port: SERVER_PORT,
				path: SERVER_PATH, // Adjust path according to your requirements
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				,	'Content-Length': Buffer.byteLength(postData)
				}
			};

			const req = https.request(options, (res) => {
				console.log(`Heartbeat status code: ${res.statusCode}`);
				if (res.statusCode === 200) {
					// Schedule the next heartbeat after a successful response
				} else {
					console.error("Heartbeat failed. Checking connection again.");
					setTimeout(ensureInternetAndHeartbeat, RETRY_INTERNET_PERIOD);
					clearInterval(heartbeatInterval);
				}

			});
			
			//send the stl object as the request body
			req.write(postData);


			req.on('error', (e) => {
				console.error(`Problem with heartbeat request: ${e.message}`);
				console.error("Attempting to check internet connection again.");
				setTimeout(ensureInternetAndHeartbeat, RETRY_INTERNET_PERIOD);
				clearInterval(heartbeatInterval);
			});

			req.end();

		}, HEARTBEAT_PERIOD);
	}
}

// Using IIFE to avoid async/await restriction
(async function main() { 
	await stl.powerOnSelfTest();
	stl.doCycle();
	//stl.blinkAll()
	stl.drawLights();
	//ntpSync();
	ensureInternetAndHeartbeat();
	startServer(stl, PORT);
})();