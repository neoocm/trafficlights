
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
		

		// Check if majority accepted
		if (state.proposals[proposalId].acceptedCount > semaphores.length / 2) {
			state.agreedState = proposalData;
			broadcastPhaseChange(proposalData);
			res.send({ status: 'success', id: proposalId, result: 'Proposal accepted' });
		} else {
			res.send({ status: 'failure', id: proposalId, result: 'Proposal rejected' });
		}
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
	//stl.drawLights();
	//ntpSync();
	//startHeartbeat();
	startServer(stl, port);
})();

