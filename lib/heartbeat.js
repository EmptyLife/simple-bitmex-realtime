
const EventEmiiter = require("events")

class Heartbeat extends EventEmiiter {
	constructor(events, options) {
		super();
		
		this.events = events;
		this.options = {
			msg_timeout: 5e3,
			ping_timeout: 5e3,
			
			...options
		};
		
		
		this.STATE_EXPECTED_OPEN = 1;
		this.STATE_EXPECTED_MESSAGE = 2;
		this.STATE_EXPECTED_PONG = 3;
		
		this.lastTime = null;
		this._updateTime();
		
		this.state = this.STATE_EXPECTED_OPEN;
		
		this.iid = null;
		events.on("open", () => {
			this.iid = setInterval(this._checkTime.bind(this), 1e3);
			this.state = this.STATE_EXPECTED_MESSAGE;
		});
		events.on("close", () => {
			(this.iid !== null) && clearInterval(this.iid);
			this.iid = null;
		});
		events.on("message", (message) => {
			if ( message === "ping" ) { 
				this.emit("pong"); 
			}
			if ( message === "pong" ) {
				this.state = this.STATE_EXPECTED_MESSAGE;
			}
			
			this._updateTime();
		});
	}
	
	_checkTime() {
		const time = Date.now();
		
		if ( this.state === this.STATE_EXPECTED_MESSAGE ) {
			if ( this.lastTime + this.options.msg_timeout <= time ) {
				this.emit("ping");
				this._updateTime();
				this.state = this.STATE_EXPECTED_PONG;
			}
		}
		
		if ( this.state === this.STATE_EXPECTED_PONG ) {
			if ( this.lastTime + this.options.ping_timeout <= time ) {
				this.emit("reconnect");
				this._updateTime();
				this.state = this.STATE_EXPECTED_OPEN;
			}
		}
		
	}
	_updateTime() {
		this.lastTime = Date.now();
	}

}

module.exports = Heartbeat;
