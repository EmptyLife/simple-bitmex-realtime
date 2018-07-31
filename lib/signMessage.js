
const crypto = require('crypto')
const querystring = require('querystring')

class SignMessage {
	static signMessage(secret, verb, url, nonce, data) {
		if ( !data ) {
			data = "";
		} else if ( data instanceof Object ) {
			data = JSON.stringify(data);
		}

		return crypto.createHmac('sha256', secret).update(verb + url + nonce + data).digest('hex');
	}
	static getWSAuthQuery(apiKey, apiSecret) {
		const nonce = Date.now() * 1000 + (this.nonceCounter++ % 1000); // prevents colliding nonces. Otherwise, use expires
		return querystring.stringify({
			'api-nonce': nonce,
			'api-key': apiKey,
			'api-signature': this.signMessage(apiSecret, 'GET', '/realtime', nonce)
		});
	}
}
SignMessage.nonceCounter = 0;

module.exports = SignMessage;
