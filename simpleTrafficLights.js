const Light = require('./light.js');
const Util = require('./util.js');
const uuid = require('uuid');
const P = require('./persistence.js');

class SimpleTrafficLight{

	constructor(name)
	{
		this.id = uuid.v4();
		this.name = name;
		this.board = new Array(3).fill(0);
		let failRate = 0;
		let redLight = new Light(this, 0, Light.Colors.RED, Light.Icons.DOT, failRate);
		let yellowLight = new Light(this, 1, Light.Colors.YELLOW, Light.Icons.DOT, failRate);
		let greenLight = new Light(this, 2, Light.Colors.GREEN, Light.Icons.DOT, failRate);

		this.lights = [redLight, yellowLight, greenLight];
		//States podria ser [Light.Icons.DOT, 0, 0] para ir cambiando tambien las formas
		this.startingTime = 0;
		this.states = [[1,0,0],[0,1,0],[0,0,1]];
		this.baseTimes = [1000,500,1000];
		this.configTimes = null;

		let saved = P.read(name);
		if(saved)
		{
			saved.id && (this.id = saved.id);
			saved.startingTime && (this.startingTime = saved.startingTime);
			saved.states && (this.states = saved.states);
			saved.baseTimes && (this.baseTimes = saved.baseTimes);
			saved.configTimes && (this.configTimes = saved.configTimes);
		}
		else{
			P.write(this.name, this.toJSON());
		}

		this.currentPeriod = this.getPeriod();
		this.currentState = null;
		this.cycleTimeout = null;
	}

	areAllFailing()
	{
		for (let i = 0; i<this.lights.length; i++) {
			let light = this.lights[i];
			if(!light.isFailing())
			{
				return false;
			}
		}
		return true;
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

	checkApplyCommitted()
	{
		let data = P.read(this.name);
		let res = 0;
		if(data.committed && data.committed.startingTime <= new Date().getTime())
		{
			try{
				if(data.committed.configTimes)
				{
					res = this.setTimes(data.committed.startingTime, data.committed.configTimes, false);
					if(!res) return 0;
				}
				if(data.committed.baseTimes)
				{
					res = this.setTimes(data.committed.startingTime, data.committed.baseTimes, true, data.committed.states);
					if(!res) return 0;
				}
				//Read again because setTimes changes the object
				data = P.read(this.name);
				delete data.committed;
				P.write(this.name, data);
				return 1;
			}
			catch(e)
			{
				return 0;
			}
		}
	}

	validate(startingTime, times, base, states=null)
	{
		if(!(base === true || base === false || base === 0 || base === 1))
		{
			console.error('Base must be a boolean');
			return 0;
		}
		if(base)
		{
			if(states !== null)
			{
				for (let i = 0; i<states.length; i++) {
					if(states[i].length != this.lights.length)
					{
						console.error('All states must have the same number of lights');
						return 0;
					}
				}
			}
		}
		if(base && times === null)
		{
			console.error('Base times cannot be null');
			return 0;
		}
		if(times !== null)
		{
			if(!Array.isArray(times))
			{
				console.error('The times param needs to be an array');
				return 0;
			}
	
			for (let i = 0; i<times.length; i++) {
				if(typeof times[i] != 'number')
				{
					console.error('The times param needs to be an array of integers only');
					return 0;
				}
			}
		}

		if(typeof startingTime != 'number' || startingTime<0)
		{
			console.error('Starting time must be a positive number');
			return 0;
		}
		
		return 1;
	}

	setTimes(startingTime, times, base, states=null)
	{
		console.log('Setting', base?'base':'config' , ' times');
		if (!this.validate(startingTime, times, base))
		{
			return 0;
		}

		if(states)
		{
			this.states = states;
			if(this.currentState >= states.length)
			{
				this.currentState = 0;
			}
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
		//Save the 4 variables
		P.append(this.name, {
			startingTime: this.startingTime,
			states: this.states,
			baseTimes: this.baseTimes,
			configTimes: this.configTimes
		});
		return 1;
	}

	async powerOnSelfTest()
	{
		console.log(`Starting P.O.S.T. for traffic light ${this.id}`);
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
				//console.log(now,now.getMilliseconds(),this.name,i);
			}
		}
	}

	doCycle()
	{
		// Check if there is something to be changed
		this.checkApplyCommitted()
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
		output += this.states.join(' | ') + '\n';

		output += '+--'+'-'.repeat(this.name.length+2)+'--+\n';
		return output;
	}

	toJSON()
	{
		return {
			name:this.name
		,	id: this.id
		,	baseTimes: this.baseTimes
		,	configTimes: this.configTimes
		,	startingTime: this.startingTime
		,	currentState: this.currentState
		,	lights: this.lights.map(light => {
				return light.toJSON();
			})
		}
	}

	drawLights()
	{
		setInterval(()=>{
			console.log(this.toString());
		},100);
	}
}

module.exports = SimpleTrafficLight