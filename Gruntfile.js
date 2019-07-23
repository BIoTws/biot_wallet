module.exports = function(grunt) {
	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		babel: {
			options: {
				sourceMaps: false,
				presets: ['@babel/preset-env']
			},
			prod: {
				files: {
					'www/biot.js': 'www/biot.js'
				}
			},
		},
		browserify: {
			dist:{
				options:{
					exclude: ['sqlite3', 'nw.gui', 'mysql', 'ws', 'regedit', 'fs', 'path', 'socks'],
					ignore: ['./node_modules/ocore/kvstore.js', './node_modules/ocore/desktop_app.js', './node_modules/ocore/mail.js']
				},
				src: ['biot/biot.js', 'biot/conf.js', 'biot/light_attestations.js'],
				dest: 'www/biot.js'
			}
		},
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-babel');

	grunt.registerTask('cordova', ['browserify']);
};