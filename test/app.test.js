var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var assert = require('assert');
var AppTester = vumigo.AppTester;


describe("app", function() {
    describe("GoApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'refugeerights',
                    env: 'test',
                    metric_store: 'refugeerights_test',
                    channel: "555",
                    control: {
                        username: "test_user",
                        api_key: "test_key",
                        url: "http://fixture/subscription/api/v1/"
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(function(d) {
                        d.repeatable = true;
                        api.http.fixtures.add(d);
                    });
                })
                .setup(function(api) {
                    api.metrics.stores = {'refugeerights_test': {}};
                });
        });

        describe("when the user starts a session", function() {
            it("should ask them what they want to do", function() {
                return tester
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_start',
                        reply: [
                            'Hi there! What do you want to do?',
                            '1. Show this menu again',
                            '2. Exit'
                        ].join('\n')
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.refugeerights_test;
                        assert.deepEqual(metrics['total.unique_users'].values, [1]);
                        assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
                    })
                    .run();
            });
        });

        describe("when the user asks to see the menu again", function() {
            it("should show the menu again", function() {
                return tester
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_start',
                        reply: [
                            'Hi there! What do you want to do?',
                            '1. Show this menu again',
                            '2. Exit'
                        ].join('\n')
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.refugeerights_test;
                        assert.deepEqual(metrics['total.unique_users'].values, [1]);
                        assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
                        assert.deepEqual(metrics['total.reached_state_end'], undefined);
                        assert.deepEqual(metrics['total.reached_state_end.transient'], undefined);
                    })
                    .run();
            });
        });

        describe("when the user asks to exit", function() {
            it("should say thank you and end the session", function() {
                return tester
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_start
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_end',
                        reply: 'Thanks, cheers!'
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.refugeerights_test;
                        assert.deepEqual(metrics['total.unique_users'].values, [1]);
                        assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
                        assert.deepEqual(metrics['total.reached_state_end'].values, [1]);
                        assert.deepEqual(metrics['total.reached_state_end.transient'].values, [1]);
                    })
                    // check session ends
                    .check.reply.ends_session()
                    .run();
            });
        });
    });
});