
const EventEmiiter = require("events")
const assert = require("assert")
const WebSocketClientReconnect = require("simple-web-socket-client-reconnect")
const DeltaParser = require("./lib/deltaParser")
const SignMessage = require("./lib/SignMessage")
const Heartbeat = require("./lib/Heartbeat")


const URL = "wss://www.bitmex.com/realtime";
const URL_TESTNET = "wss://testnet.bitmex.com/realtime";
const NO_SYMBOL_TABLES = [ 'account', 'affiliate', 'funds', 'insurance', 'margin', 'transact', 'wallet', 'announcement', 'connected', 'chat', 'publicNotifications', 'privateNotifications' ];

class Realtime extends EventEmiiter {
	constructor(options) {
		super();
		
		this.options = {
			testnet: false,
			reconnect: true,
			apiKeyID: "",
			apiKeySecret: "",
			...options
		};
		
		this.deltaParser = new DeltaParser({
			noSymbolTables: NO_SYMBOL_TABLES,
			maxTableLength: this.options.maxTableLength,
		});
		
		this.subscribeArray = [];
		
		this.socket = new WebSocketClientReconnect(this._getUrl(), {
			reconnect: this.options.reconnect
		});
		this.socket.on("message", this._parseMessage.bind(this));
		
		this.socket.on("open", () => {
			//console.log("open", this.subscribeArray)

			for(const [table, symbol] of this.subscribeArray) {
				this._sendCmd("subscribe", [`${table}:${symbol}`]);
			}
		});
	
	
	
		this.heartbeat = new Heartbeat(this.socket);
		this.heartbeat.on("ping", () => {
			//console.log("heartbeat:ping")
			if ( this.socket.isOpened() ) {
				this.socket.send("ping");
			}
		});
		this.heartbeat.on("pong", () => {
			//console.log("heartbeat:pong")
			if ( this.socket.isOpened() ) {
				this.socket.send("pong");
			}
		});
		this.heartbeat.on("reconnect", () => {
			//console.log("heartbeat:reconnect")
			
			if ( !this.socket.isClosed() ) {
				this.socket.reopen();
			}
		});
	
	
		this.socket.on("open", (...args) => this.emit("open", ...args));
		this.socket.on("close", (...args) => this.emit("close", ...args));
		this.socket.on("error", (...args) => this.emit("error", ...args));
		this.socket.on("reconnect", (...args) => this.emit("reconnect", ...args));
		this.socket.on("reopen", (...args) => this.emit("reopen", ...args));
	}
	
	_getUrl() {
		let url = this.options.testnet ? URL_TESTNET: URL;
		
		if ( this.options.apiKeyID && this.options ) {
			url += "?" + SignMessage.getWSAuthQuery(this.options.apiKeyID, this.options.apiKeySecret);
		}
		
		return url;
	}
	
	isOpened(...args) {return this.socket.isOpened(...args);}
	isClosed(...args) {return this.socket.isClosed(...args);}
	send(...args) {return this.socket.send(...args);}
	reconnect(...args) {return this.socket.reconnect(...args);}
	close() {
		this.socket.close();
	}
	
	_sendCmd(cmd, args) {
		this.socket.send(JSON.stringify({op: cmd, args}));
	}
	_parseMessage(message) {
		try {
			message = JSON.parse(message);
			assert(message instanceof Object)
		} catch(e) {
			return;
		}
		
		if ( "subscribe" in message ) {
			try {
				if ( "success" in message && message.success ) {
					this.emit("subscribe:${message.subscribe}");
				}
				if ( "error" in message ) {
					this.emit("error", new Error(`Unable to subscribe to ${message.request.args[0]}. Error: "${message.error}" Please check and restart.`));
				}
			} catch(e) {}     
		} else
		if ( "status" in message ) {
			if ( message.status === 400 ) {
				this.emit("error", new Error(message.error));
			}
			if ( message.status === 401 ) {
				this.emit("error", new Error("API Key incorrect, please check and restart."));
			}
		} else 
		if ( "action" in message && "table" in message && "data" in message ) {
			const array = this.deltaParser.parse(message);
			for(const args of array) {
				this.emit(...args);
			}
			//console.log(">"+array.map(v=>v[0]).slice(-1)[0]);
		} else 
		if ( "info" in message && "version" in message ) {
			this.emit("info", message);
		}
	}

	subscribe(table, symbol, callback) {
		if ( !callback && typeof symbol === "function" ) {
			callback = symbol;
			symbol = null;
		}
		
		symbol = symbol || "*";
		const id = `${table}:${symbol}` ;
		this.subscribeArray.push([table, symbol]);
		
		if ( callback ) {
			this.on(id, callback);
		}
		
		if ( this.isOpened() ) {
			this._sendCmd("subscribe", [id]);
		}
	}
	unsubscribe(table, symbol) {
		symbol = symbol || "*";
		const id = `${table}:${symbol}` ;
		if ( symbol === "*" ) {
			this.subscribeArray = this.subscribeArray.filter(v => !(v[0] === table));
		}
		this.subscribeArray = this.subscribeArray.filter(v => !(v[0] === table && v[1] === symbol));

		if ( this.isOpened() ) {
			this._sendCmd("unsubscribe", [id]);
		}
	}
	
}

module.exports = Realtime;
