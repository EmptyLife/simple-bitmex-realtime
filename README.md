# simple-bitmex-realtime

## Install
`npm i EmptyLife/simple-bitmex-realtime`


## Example
```javascript
const SimpleBitmexRealtime = require("simple-bitmex-realtime")
const client = new SimpleBitmexRealtime({ apiKeyID: "", apiKeySecret: "", testnet: false});
client.on("open", () => console.log("WSClient open"))
client.on("close", () => console.log("WSClient close"))
client.on("error", (error) => console.log("WSClient error", error))
client.on("reconnect", () => console.log("WSClient reconnect"))

client.subscribe("trade", "XBTUSD", (tradeTable) => {
	/// last trade
	console.log(tradeTable[tradeTable.length-1]);
});
```
