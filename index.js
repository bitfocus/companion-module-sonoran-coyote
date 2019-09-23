var tcp           = require('../../tcp');
var udp           = require('../../udp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions
	self.init_presets();

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.init_presets();

	if (self.udp !== undefined) {
		self.udp.destroy();
		delete self.udp;
	}

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	self.config = config;

	if (self.config.prot == 'tcp') {
		self.init_tcp();
	}

	if (self.config.prot == 'udp') {
		self.init_udp();
	}
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;
	self.init_presets();

	if (self.config.prot == 'tcp') {
		self.init_tcp();
	}

	if (self.config.prot == 'udp') {
		self.init_udp();
	}
};

instance.prototype.init_udp = function() {
	var self = this;

	if (self.udp !== undefined) {
		self.udp.destroy();
		delete self.udp;
	}

	self.status(self.STATE_WARNING, 'Connecting');

	if (self.config.host !== undefined) {
		self.udp = new udp(self.config.host, self.config.port);

		self.udp.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
		});

		// If we get data, thing should be good
		self.udp.on('data', function () {
			self.status(self.STATE_OK);
		});

		self.udp.on('status_change', function (status, message) {
			self.status(status, message);
		});
	}
};

instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	self.status(self.STATE_WARNING, 'Connecting');

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			debug("Connected");
		})

		//self.socket.on('data', function (data) {});
	}
};


// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			label: 'Information',
			width: 12,
			value: 'Please keep in mind that UDP support on port 9000 is not implemented yet in the Coyote firmware.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 5,
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Target Port (Default: 7000)',
			width: 3,
			default: 7000,
			regex: self.REGEX_PORT
				},
		{
			type: 'dropdown',
			id: 'prot',
			label: 'Connect with TCP / UDP',
			default: 'tcp',
			choices:  [
				{ id: 'tcp', label: 'TCP' },
				{ id: 'udp', label: 'UDP' }
			]
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	if (self.udp !== undefined) {
		self.udp.destroy();
	}

	debug("destroy", self.id);
};

instance.prototype.CHOICES_COMMANDS = [
	{ id: 'play', 					label: 'Play', 					value: '0'},
	{ id: 'pause', 					label: 'Pause', 				value: '0'},
	{ id: 'end', 						label: 'End', 					value: '0'},
	{ id: 'take_next', 			label: 'Take Next'},
	{ id: 'take_prev', 			label: 'Take Prev'},
	{ id: 'select_next', 		label: 'Select Next'},
	{ id: 'select_prev', 		label: 'Select Prev'},
	{ id: 'select_preset',	label: 'Select Preset', value: '0'},
];

instance.prototype.CHOICES_SEEK_TO = [
	{ id: 'seek_to', label: 'Seek to 1 sec',	value: '0', time: '1000'},
	{ id: 'seek_to', label: 'Seek to 5 sec', 	value: '0', time: '5000'},
	{ id: 'seek_to', label: 'Seek to 10 sec', value: '0', time: '10000'},
	{ id: 'seek_to', label: 'Seek to 30 sec', value: '0', time: '30000'},
];

instance.prototype.CHOICES_SYSTEM = [
	{ id: 'reboot', 			label: 'Reboot' },
	{ id: 'soft_reboot', 	label: 'Soft Reboot' },
	{ id: 'shutdown', 		label: 'Shutdown' },
];

instance.prototype.init_presets = function () {
	var self = this;
	var presets = [];
	var pstSize = '18';

	for (var input in self.CHOICES_COMMANDS) {
		presets.push({
			category: 'Commands',
			label: self.CHOICES_COMMANDS[input].label,
			bank: {
				style: 'text',
				text: self.CHOICES_COMMANDS[input].label,
				size: pstSize,
				color: '16777215',
				bgcolor: 0
			},
			actions: [{
				action: self.CHOICES_COMMANDS[input].id,
				options: {
					id: self.CHOICES_COMMANDS[input].value,
				}
			}]
		});
	}

	for (var input in self.CHOICES_SEEK_TO) {
		presets.push({
			category: 'Commands',
			label: self.CHOICES_SEEK_TO[input].label,
			bank: {
				style: 'text',
				text: self.CHOICES_SEEK_TO[input].label,
				size: pstSize,
				color: '16777215',
				bgcolor: 0
			},
			actions: [{
				action: self.CHOICES_SEEK_TO[input].id,
				options: {
					id: self.CHOICES_SEEK_TO[input].value,
					seek_time: self.CHOICES_SEEK_TO[input].time
				}
			}]
		});
	}

	for (var input in self.CHOICES_SYSTEM) {
		presets.push({
			category: 'System',
			label: self.CHOICES_SYSTEM[input].label,
			bank: {
				style: 'text',
				text: self.CHOICES_SYSTEM[input].label,
				size: pstSize,
				color: '16777215',
				bgcolor: self.rgb(0,0,0)
			},
			actions: [{
				action: self.CHOICES_SYSTEM[input].id,
			}]
		});
	}

	self.setPresetDefinitions(presets);
}

instance.prototype.actions = function(system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {

		'play': {
			label: 'Play Preset',
			options: [
				{
					type: 'textinput',
					id: 'id',
					label: 'Preset ID:',
					default: '0',
					width: 6
				},
			]
		},
		'pause': {
			label: 'Pause Preset',
			options: [
				{
					type: 'textinput',
					id: 'id',
					label: 'Preset ID:',
					default: '0',
					width: 6
				},
			]
		},
		'end': {
			label: 'End Preset',
			options: [
				{
					type: 'textinput',
					id: 'id',
					label: 'Preset ID:',
					default: '0',
					width: 6
				},
			]
		},
		'seek_to': {
			label: 'SeekTo',
			options: [
				{
					type: 'textinput',
					id: 'id',
					label: 'Preset ID:',
					default: '0',
					width: 6
				},
				{
					type: 'number',
					id: 'seek_time',
					label: 'Time in ms (10 sec = 10000):',
					min: 1,
					max: 10000000,
					default: 10000,
					required: true,
					range: false,
					regex: self.REGEX_NUMBER
				}
			]
		},
		'take_next': {
			label: 'Play Next Preset',
			options: [
			]
		},
		'take_prev': {
			label: 'Play Prev Preset',
			options: [
			]
		},
		'select_next': {
			label: 'Select Next Preset',
			options: [
			]
		},
		'select_prev': {
			label: 'Select Prev Preset',
			options: [
			]
		},
		'select_preset': {
			label: 'Select Preset',
			options: [
				{
					type: 'textinput',
					id: 'id',
					label: 'Preset ID:',
					default: '1',
					width: 6
				},
			]
		},
		'reboot': {
			label: 'Reboot Coyote',
			options: [
			]
		},
		'soft_reboot': {
			label: 'Soft Reboot Coyote',
			options: [
			]
		},
		'shutdown': {
			label: 'Shutdown Coyote',
			options: [
			]
		},
	});
}

instance.prototype.action = function(action) {
	var self = this;
	var cmd;

	switch(action.action) {

		case 'play':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "Take", "Data" : { "PK" : ' + action.options.id + ' } } \r\n\r\n';
			break;

		case 'pause':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "Pause", "Data" : { "PK" : ' + action.options.id + ' } } \r\n\r\n';
			break;

		case 'end':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "End", "Data" : { "PK" : ' + action.options.id + ' } } \r\n\r\n';
			break;

		case 'seek_to':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "SeekTo", "Data" : { "PK" : ' + action.options.id + ', "TimeIndex" : ' + action.options.seek_time + '} } \r\n\r\n';
			break;

		case 'take_next':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "TakeNext" } \r\n\r\n';
			break;

		case 'take_prev':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "TakePrev" } \r\n\r\n';
			break;

		case 'select_next':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "SelectNext" } \r\n\r\n';
			break;

		case 'select_prev':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "SelectPrev" } \r\n\r\n';
			break;

		case 'select_preset':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "SelectPreset", "Data" : { "PK" : ' + action.options.id + ' } } \r\n\r\n';
			break;

		case 'reboot':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "RebootCoyote" } \r\n\r\n';
			break;

		case 'soft_reboot':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "SoftRebootCoyote" } \r\n\r\n';
			break;

		case 'shutdown':
			cmd = '{ "CoyoteAPIVersion" : "0.3", "CommandName" : "ShutdownCoyote" } \r\n\r\n';
			break;
	}

	if (self.config.prot == 'tcp') {

		if (cmd !== undefined) {

			debug('sending ',cmd,"to",self.config.host);

			if (self.socket !== undefined && self.socket.connected) {
				self.socket.send(cmd);
			}
			else {
				debug('Socket not connected :(');
			}
		}
	}

	if (self.config.prot == 'udp') {

		if (cmd !== undefined ) {

			if (self.udp !== undefined ) {
				debug('sending',cmd,"to",self.config.host);

				self.udp.send(cmd);
			}
		}
	}
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;
