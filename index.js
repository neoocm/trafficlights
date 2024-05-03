const P = require('./persistence.js');
const Util = require('./util.js');

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
const port = parseInt(args[3], 10);
// Validate the port to ensure it's a positive integer
if (isNaN(port) || port <= 0) {
	console.log('The port must be a positive integer.');
	process.exit(1);
}


////////////////// FUNCTIONS ////////////////////////

function startServer(stl, port)
{
	app.post('/propose', (req, res) => {
		
		// write a 2 step consensus algorithm that will receive data to be saved in the traffic light and reply ok, then wait for the commit, if after 100000 seconds it does not receive the commit, die

		// 1. Parse the raw body of the request
		let data = req.body;
		if(!data)
		{
			res.status(400).send('No data received');
			return;
		}
		console.log('Received data:');
		console.log(data);

		// 2. Reply OK
		res.status(200).send('OK');

		// save the data
		P.append(stl.name, {proposed: data});

		// 3. Wait for commit
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
		}, 100000);
	});

	app.post('/commit', (req, res) => {
		clearTimeout(stl.commitTimeout);
		res.status(200).send('OK');
		let data = P.read(stl.name);
		if(data.proposed.times)
		{
			stl.setTimes(data.proposed.startingTime, data.proposed.times, false);
		}
		if(data.proposed.baseTimes)
		{
			stl.setTimes(data.proposed.startingTime, data.proposed.baseTimes, true);
		}
		delete data.proposed;
		P.write(stl.name, data);
	});

	app.listen(port, () => {
		console.log(`Server running on port ${port}`);
	});
}


////////////////// MAIN SEQUENCE ////////////////////////

const STL = require('./simpleTrafficLights.js');
const express = require('express');
const app = express();
app.use(express.json());

let stl = new STL(name);
process.on('uncaughtException', e=>{
	console.log('--------------------------------------------------------> FAILED!');
	console.log(e);
	setTimeout(()=>{
		stl.blinkAll();
	},500);
});

// Using IIFE to avoid async/await restriction
(async function() { 
	await stl.powerOnSelfTest();
	stl.doCycle();
	//stl.blinkAll()
	stl.drawLights();
	//ntpSync();
	//startHeartbeat();
	startServer(stl, port);
})();

