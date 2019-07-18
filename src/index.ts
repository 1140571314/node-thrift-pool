import thrift from 'thrift';
export default class ThriftPool {
	queue = {};
	size = 20;
	key = ''
	constructor(TService, thriftOptions) {
		const DEFAULT_THRIFT_OPTIONS = {
			transport: thrift.TFramedTransport,
			protocol: thrift.TBinaryProtocol,
			connect_timeout: 3000,
			timeout: 3000,
			max_attempts: 3,
		};
		if (!TService) {
			throw new Error('no TService');
		}
		if (!thriftOptions.host || !thriftOptions.port) {
			throw new Error('PooledThriftClient: both host and port must be specified');
		}
		thriftOptions = Object.assign({}, DEFAULT_THRIFT_OPTIONS, thriftOptions);
		this.createPool(this.size, TService, thriftOptions);
	}
	createThriftConnection(thriftOptions) {
		const { host, port, ...otherOptions } = thriftOptions;
		const connection = thrift.createConnection(host, port, otherOptions);
		connection.alive = false; // add a property for validation purposes
		connection.on('connect', this.resolveFun('connect'));
		connection.on('error', this.resolveFun('error'));
		connection.on('timeout', this.resolveFun('timeout'));
		return connection;
	}
	resolveFun(message?: any, name?: string) {
		console.log(`thrift connection is ${name} ${message}`);
	}
	createThriftClient(proxy, thriftOptions) {
		const connector = this.createThriftConnection(thriftOptions);
		const client = thrift.createClient(proxy, connector);
		return client;
	}
	createPool(size, TService, thriftOptions) {
		this.size = size;
		const key = thriftOptions.host + thriftOptions.port;
		const client = this.createThriftClient(TService, thriftOptions)
		if (!Array.isArray(this.queue[key])) {
			this.queue[key] = [];
			for (let i = 0; i < size; i++) {
				this.queue[key].push(client);
			}
		}
		console.log(this.queue[key].length, 'createPool')
		return this.queue[key];
	}
	acquire(key) {
		this.key = key;
		const len = this.queue[key].length;
		if (len < 5) {
			this.queue[key].concat(this.queue[key]);
		}
		console.log(this.queue[key].length, 'acquire')
		return this.queue[key].pop();
	}
	release(client, key) {
		const len = this.queue[this.key].length;
		if (len <= this.size) {
			this.queue[key].push(client);
		} else {
			client.destroy();
		}
		console.log(this.queue[key].length, 'release')
	}
	getCurrentPoolSize(key) {
		return this.queue[key].length;
	}
	showPoolDetail() {
		return JSON.stringify(this.queue, null, 4);
	}
}

