module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    ussdapp: 'src/ussdapp.js',
                    smsapp: 'src/smsapp.js'
                },
                ussdapp: [
                    'src/index.js',
                    '<%= paths.src.app.ussdapp %>',
                    'src/init.js'
                ],
                smsapp: [
                    'src/index.js',
                    '<%= paths.src.app.smsapp %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                ussdapp: 'go-app-ussd.js',
                smsapp: 'go-app-sms.js'
            },
            test: {
                ussdapp: [
                    'test/setup.js',
                    '<%= paths.src.app.ussdapp %>',
                    'test/ussdapp.test.js'
                ],
                smsapp: [
                    'test/setup.js',
                    '<%= paths.src.app.smsapp %>',
                    'test/smsapp.test.js'
                ]
            }
        },

        jshint: {
            options: {jshintrc: '.jshintrc'},
            all: [
                'Gruntfile.js',
                '<%= paths.src.all %>'
            ]
        },

        watch: {
            src: {
                files: [
                    '<%= paths.src.all %>'
                ],
                tasks: ['default', 'build'],
                options: {
                    atBegin: true
                }
            }
        },

        concat: {
            options: {
                banner: [
                    '// WARNING: This is a generated file.',
                    '//          If you edit it you will be sad.',
                    '//          Edit src/app.js instead.',
                    '\n' // Newline between banner and content.
                ].join('\n')
            },

            ussdapp: {
                src: ['<%= paths.src.ussdapp %>'],
                dest: '<%= paths.dest.ussdapp %>'
            },

            smsapp: {
                src: ['<%= paths.src.smsapp %>'],
                dest: '<%= paths.dest.smsapp %>'
            },

        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            test_ussdapp: {
                src: ['<%= paths.test.ussdapp %>']
            },
            test_smsapp: {
                src: ['<%= paths.test.smsapp %>']
            }
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'build',
        'mochaTest'
    ]);

    grunt.registerTask('build', [
        'concat',
    ]);

    grunt.registerTask('default', [
        'build',
        'test'
    ]);
};
