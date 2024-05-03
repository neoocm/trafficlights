const Light = require('./light.js');
const Util = require('./util.js');
const uuid = require('uuid');

class SimpleTrafficLight{

	constructor(name)
	{
		this.uuid = uuid.v4();
		this.name = name;
		this.board = new Array(3).fill(0);
		let failRate = 0;
		let redLight = new Light(this.board, 0, Light.Colors.RED, Light.Icons.DOT, failRate);
		let yellowLight = new Light(this.board, 1, Light.Colors.YELLOW, Light.Icons.DOT, failRate);
		let greenLight = new Light(this.board, 2, Light.Colors.GREEN, Light.Icons.DOT, failRate);

		this.lights = [redLight, yellowLight, greenLight];
		this.states = [[1,0,0],[0,1,0],[0,0,1]];
		this.startingTime = 0;
		this.baseTimes = [5000,1000,5000];
		this.configTimes = null;
		this.currentPeriod = this.getPeriod();
		this.currentState = null;
		this.cycleTimeout = null;
	}

	getTimeConfig()
	{
		return this.configTimes ? this.configTimes : this.baseTimes;
	}

	sumTimes(lastIndex)
	{
		let period = 0;
		let times = this.getTimeConfig();
		if(!lastIndex)
		{
			lastIndex = times.length;
		}
		for (let i = 0; i<lastIndex; i++) {
			period += times[i];
		}
		return period;
	}

	getPeriod()
	{
		return this.sumTimes();
	}

	setTimes(startingTime, times, base)
	{
		if(!Array.isArray(times) || times.length != this.states.length)
		{
			console.error('The times param needs to be an array of same length as the number of states for this traffic light');
			return null;
		}
		for (let i = 0; i<this.times.length; i++) {
			if(typeof times[i] != 'number')
			{
				console.error('The times param needs to be an array of integers only');
				return null;
			}
		}
		if(typeof startingTime != 'number' || startingTime<0)
		{
			console.error('Starting time must be a positive number');
			return null;
		}

		if(base)
		{
			this.baseTimes = times;
		}
		else
		{
			this.configTimes = times;
		}
		this.currentPeriod = this.getPeriod();
		this.startingTime = startingTime;
	}

	async powerOnSelfTest()
	{
		console.log(`Starting P.O.S.T. for traffic light ${this.uuid}`);
		// Check all lights are OFF
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			if(light.isOn()){
				console.log(`The light ${i} failed to be off on P.O.S.T.. Exiting`);
				process.exit(1);
			}
		}
		// Turn them on for a second and then off
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			light.on(1000);
		}
		await Util.sleep(500);
		// Check all lights are ON
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			if(!light.isOn()){
				console.log(`The light ${i} failed to turn on on P.O.S.T.. Exiting`);
				process.exit(1);
			}
		}
		await Util.sleep(1000);
		// Check all lights are OFF
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			if(light.isOn()){
				console.log(`The light ${i} failed to turn on on P.O.S.T.. Exiting`);
				process.exit(1);
			}
		}
		console.log('P.O.S.T. succeeded! Loading up..');
	}

	switch(stateIndex)
	{
		if(typeof stateIndex != 'number' || stateIndex >= this.states.length || stateIndex<0){
			throw `Cannot switch to inexistent state ${stateIndex}`;
		}
		
		let state = this.states[stateIndex];
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			let lightState = state[i];
			lightState == 1 ? light.on() : light.off();
			
			if(lightState == 1)
			{
				let now = new Date();
				console.log(now,now.getMilliseconds(),this.name,i);
			}
		}
	}

	doCycle()
	{
		// Align the phase with the starting time to see which state to go next
		let times = this.getTimeConfig();
		let now = new Date().getTime();
		let elapsed = (now-this.startingTime) % this.getPeriod();
		let remaining = elapsed; //This is the remaining of the corresponding state
		for(var i = 0; i<this.states.length; i++)
		{
			if(remaining>=times[i])
			{
				remaining -= times[i];
			}
			else
			{
				remaining = times[i]-remaining;
				break;
			}
		}
		this.currentState =  i % this.states.length; //Modulus in case it does not exit the loop in break
		remaining = Math.max(0, remaining); // 0 in case it goes negative

		// Make the switch
		this.switch(this.currentState);

		// Loop
		this.cycleTimeout = setTimeout(()=>{
			this.doCycle();
		}, remaining);
	}

	stopCycle()
	{
		if(this.cycleTimeout)
		{
			clearTimeout(this.cycleTimeout);
			this.cycleTimeout = null;
		}
	}

	blinkAll()
	{
		this.stopCycle();
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			light.blink(null,true);
		}
	}

	toString()
	{
		let output = '+-- '+this.name+' --+\n';
		for(let i = 0; i<this.lights.length; i++)
		{
			output += this.lights[i].toString() + '\n';
		}

		output += '+--'+'-'.repeat(this.name.length+2)+'--+\n';
		return output;
	}

	drawLights()
	{
		setInterval(()=>{
			console.log(this.toString());
		},100);
	}
}

module.exports = SimpleTrafficLight