var rewriteRulesSnippet = require('grunt-connect-rewrite/lib/utils').rewriteRequest;

module.exports = function (grunt) {

    'use strict';

    grunt.initConfig({
    	options: {
    		projectPath: 'projects/**/*.framer'
    	},
        connect: {
            server: {
	            options: {
	                port: 4000,
	                hostname: '*',
	                livereload: true,
	                base: 'projects/',
	            	middleware: function(connect, options) {
		                var middlewares = [];
                        // RewriteRules support
                        middlewares.push(rewriteRulesSnippet);
                        if (!Array.isArray(options.base)) {
                            options.base = [options.base];
                        }
                        var directory = options.directory || options.base[options.base.length - 1];
                        options.base.forEach(function (base) {
                            // Serve static files.
                            middlewares.push(connect.static(base));
                        });
                        // Make directory browse-able.
                        middlewares.push(connect.directory(directory));
		                return middlewares;
		            }
	            }
            },
            rules: [
            	{ from: '^/(.*?)/(.*)$', to: '/$1/$1.framer/$2' }
            ]
        },
        watch: {
            html: {
                files: [
                    '<%= options.projectPath %>/index.html',
                    '<%= options.projectPath %>/app.js',
                    '<%= options.projectPath %>/images/**',
                    '<%= options.projectPath %>/framer/**',
                    '<%= options.projectPath %>/imported/**'
                ]
            },
            options: {
                livereload: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-connect-rewrite');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', [ 'configureRewriteRules', 'connect:server', 'watch' ]);

};