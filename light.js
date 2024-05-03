const Util = require('./util.js');

class Light{
	
	static Colors = {
		RED: 'red'
	,	YELLOW: 'yellow'
	,	GREEN: 'green'
	};

	static ANSI = {
	    reset: "\x1b[0m",
	    red: "\x1b[31m",
	    yellow: "\x1b[33m",
	    green: "\x1b[32m"
	};

	static Icons = {
		DOT: ''
	,	BIKE: 'bike'
	,	ARROWLEFT: 'arrowleft'
	,	ARROWRIGHT: 'arrowright'
	,	ARROWUP: 'arrowup'
	,	TURNLEFT: 'turnleft'
	,	TURNRIGHT: 'turnright'
	,	STOPHAND: 'stophand'
	,	X: 'x'
	,	PEDESTRIAN: 'pedestrian'
	};

	constructor(board, address, color, icon, failRate)
	{
		if(!Array.isArray(board))
		{
			throw `Please use an array as the board parameter for the light`;
		}
		if(address === null || typeof address != 'number' || address<0 || address >= board.length)
		{
			throw `Invalid address ${address} for light for a board of size `+board.length;
		}
		if(color === null || !Object.values(this.constructor.Colors).includes(color))
		{
			throw `Invalid color ${color} for light at ${address}`;
		}
		if(icon === null || !Object.values(this.constructor.Icons).includes(icon))
		{
			throw `Invalid icon ${icon} for light at ${address}`;
		}
		if(failRate === null || typeof failRate != 'number' || failRate < 0 || failRate > 1)
		{
			throw `Invalid failRate for light at address ${address}`;
		}

		this.color = color;
		this.icon = icon;
		this.board = board;
		this.address = address;
		this.failRate = failRate;
		this.currentSensor = 0;
		this.sensorInterval = null;
		this.offTimeout = null;
		this.failTimeout = null;
		this.currentThreshold = 0.5;
		this.isBlinking = false;
	}

	isOn()
	{
		return this.isBlinkingOn() || (this.relayTurnedOn() && this.hasCurrent());
	}

	isBlinkingOn()
	{
		return this.isBlinking;
	}

	relayTurnedOn()
	{
		return this.board[this.address] === 1;
	}

	hasCurrent()
	{
		return this.currentSensor > this.currentThreshold;
	}


	on(millis)
	{
		this.board[this.address] = 1;
		this.currentSensor = 1;
		if(Math.random() < this.failRate)
		{
			this.failTimeout = setTimeout(()=>{
				this.currentSensor = 0;
			}, Math.random()*2000);
		}
		if(millis)
		{
			if(!!this.offTimeout)
			{
				clearTimeout(this.offTimeout);
			}
			this.offTimeout = setTimeout(()=>{
				this.off();
			},millis);
		}
		if(!!this.sensorInterval)
		{
			clearInterval(this.sensorInterval);
		}
		this.sensorInterval = setInterval(()=>{
			if(!this.hasCurrent())
			{
				this.failing = true;
				if(this.isBlinkingOn())
				{
					console.log(`Current not detected for light at ${this.address} (not failing, already failed)`);
					this.blinkOff();
				}
				else
				{
					this.off();
					Util.raiseError({
						light: this
					,	errorMessage: `Current not detected for light at ${this.address}`
					});
				}
			}
		}, 200);
	}

	blink(millis, fast)
	{
		this.off();
		this.isBlinking = true;
		this.blinkInterval = setInterval(()=>{
			this.toggle();
		}, fast?500:1000);
		if(millis)
		{
			setTimeout(()=>{
				this.blinkOff();
			}, millis);
		}
	}

	blinkOff() //Public for the case when you start to blink indefinitely and dont have a programmed switch off
	{
		this.isBlinking = false;
		clearInterval(this.blinkInterval);
		this.off();
	}

	toggle()
	{
		if(this.relayTurnedOn() && this.hasCurrent())
		{
			this.off();
		}
		else
		{
			this.on();
		}
	}

	off()
	{
		this.board[this.address] = 0;
		this.currentSensor = 0;
		if(this.offTimeout)
		{
			clearTimeout(this.offTimeout);
			this.offTimeout = null;
		}
		if(this.sensorInterval)
		{
			clearInterval(this.sensorInterval);
			this.sensorInterval = null;
		}
		if(this.failTimeout)
		{
			clearTimeout(this.failTimeout);
			this.failTimeout = null;
		}
	}

	toString()
	{
		let pre = this.relayTurnedOn() ? this.constructor.ANSI[this.color] : '';
		return pre + this.color.toUpperCase()+' '+this.icon.toUpperCase()+': '+ (this.isBlinkingOn() ? 'Blinking ' : '') + (this.relayTurnedOn() ? 'ON' : 'OFF') + this.constructor.ANSI['reset'];
	}
}

module.exports = Light