var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var assert = require('assert');
var _ = require('lodash');
var AppTester = vumigo.AppTester;
var location = require('go-jsbox-location');
var openstreetmap = location.providers.openstreetmap;


describe("refugeerights app", function() {
    describe("for ussd use", function() {
        var app;
        var tester;
        var locations;

        beforeEach(function() {
            app = new go.app.GoRR();
            tester = new AppTester(app);
            locations = [];

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'refugeerights',
                    channel: '*120*8864*0000',
                    testing_today: '2015-04-03 06:07:08.999',
                    metric_store: 'refugeerights_test',  // _env at the end
                    control: {
                        username: "test_user",
                        api_key: "test_key",
                        url: "http://fixture/api/v1/"
                    },
                    location_api_url: "http://location_fixture/poifinder/",
                    poi_types: ['lawyer', 'police'],
                    template: "Nearby services: {{ results }}.",  // SMS template
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(function(d) {
                        d.repeatable = true;
                        api.http.fixtures.add(d);
                    });
                    locations.forEach(function(location) {
                        api.http.fixtures.add(openstreetmap.fixture(location));
                    });
                })
                .setup(function(api) {
                    api.metrics.stores = {'refugeerights_test': {}};
                })
                .setup(function(api) {
                    // new user 1
                    api.contacts.add({
                        msisdn: '+082111',
                        extra: {},
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                })
                .setup(function(api) {
                    // registered refugee 1
                    api.contacts.add({
                        msisdn: '+064001',
                        extra: {
                            language: 'french',
                            lang: 'fr',
                            country: 'drc',
                            status: 'refugee',
                            last_seen: '2015-03-03 12:00:00.000',
                            last_returning_metric_fire: '2015-03-03 12:00:00.000'  // >7d ago
                        },
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                })
                .setup(function(api) {
                    // registered refugee 2
                    api.contacts.add({
                        msisdn: '+064003',
                        extra: {
                            language: 'french',
                            lang: 'fr',
                            country: 'drc',
                            status: 'refugee',
                            last_seen: '2015-03-03 12:00:00.000',
                            last_returning_metric_fire: '2015-03-03 12:00:00.000'  // >7d ago
                        },
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                })
                .setup(function(api) {
                    // registered migrant 1
                    api.contacts.add({
                        msisdn: '+064002',
                        extra: {
                            language: 'french',
                            lang: 'fr',
                            country: 'drc',
                            status: 'migrant',
                            last_seen: '2015-03-31 12:00:00.000',
                            last_returning_metric_fire: '2015-03-31 12:00:00.000'  // <7d ago
                        },
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                });

            locations.push({
                query: "Quad Street",
                bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                address_limit: 4,
                response_data: [
                    {
                        display_name:"Quad St 1, Sub 1",
                        lon: '1.1',
                        lat: '1.11',
                        address: {
                            road: "Quad St 1",
                            suburb: "Suburb number 1",
                            city: "City number 1",
                            town: "Town 1",
                            state: "Western Cape",
                            postcode: "0001",
                            country: "RSA",
                            country_code: "za"
                        }
                    },{
                        display_name:"Quad St 2, Sub 2",
                        lon: '2.2',
                        lat: '2.22',
                        address: {
                            road: "Quad St 2",
                            suburb: "Suburb number 2",
                            town: "Town number 2",
                            state: "Gauteng",
                            postcode: "0002",
                            country: "RSA",
                            country_code: "za"
                        }
                    },{
                        display_name:"Quad St 3, Sub 3",
                        lon: '3.1415',
                        lat: '2.7182',
                        address: {
                            road: "Quad St 3",
                            suburb: "Suburb number 3",
                            city: "City number 3",
                            state: "Free State",
                            postcode: "0003",
                            country: "RSA",
                            country_code: "za"
                        }
                    },{
                        display_name:"Quad St 4, Sub 4",
                        lon: '3.1415',
                        lat: '2.7182',
                        address: {
                            road: "Quad St 4",
                            suburb: "Suburb number 4",
                            state: "KwaZulu-Natal",
                            postcode: "0004",
                            country: "RSA",
                            country_code: "za"
                        }
                    }
                ]
            });

            locations.push({
                query: "Friend Street",
                bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                address_limit: 4,
                response_data: [
                    {
                        display_name: "Friend Street, Suburb",
                        lon: '3.1415',
                        lat: '2.7182'
                    }
                ]
            });
        });

        // TEST PAGINATEDCHOICESTATE PAGING

        describe("PaginatedChoiceState testing using Refugee Main Menu", function() {
            describe("forward navigation", function() {
                it("should display page 2 on Next", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            '7'  // state_refugee_main (Next)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Health rights',
                                '2. Education',
                                '3. Social services',
                                '4. Banking',
                                '5. Tips page',
                                '6. Useful contacts',
                                '7. Safety concerns',
                                '8. Statelessness',
                                '9. Next',
                                '10. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 3 on Next", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            '7'  // state_refugee_main (Next p1)
                            , '9'  // state_refugee_main (Next p2)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. LGBTI rights',
                                '2. Violence against women',
                                '3. Word definitions',
                                '4. More word definitions',
                                '5. Change settings',
                                '6. Next',
                                '7. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 4 on Next", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            '7'  // state_refugee_main (Next p1)
                            , '9'  // state_refugee_main (Next p2)
                            , '6'  // state_refugee_main (Next p3)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Ts & Cs of this service',
                                '2. About LHR',
                                '3. Back'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("backward navigation", function() {
                it("should display page 3 on Back", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            '7'  // state_refugee_main (Next p1)
                            , '9'  // state_refugee_main (Next p2)
                            , '6'  // state_refugee_main (Next p3)
                            , '3'  // state_refugee_main (Back p4)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. LGBTI rights',
                                '2. Violence against women',
                                '3. Word definitions',
                                '4. More word definitions',
                                '5. Change settings',
                                '6. Next',
                                '7. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 2 on Back", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            '7'  // state_refugee_main (Next p1)
                            , '9'  // state_refugee_main (Next p2)
                            , '6'  // state_refugee_main (Next p3)
                            , '3'  // state_refugee_main (Back p4)
                            , '7'  // state_refugee_main (Back p3)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Health rights',
                                '2. Education',
                                '3. Social services',
                                '4. Banking',
                                '5. Tips page',
                                '6. Useful contacts',
                                '7. Safety concerns',
                                '8. Statelessness',
                                '9. Next',
                                '10. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 1 on Back", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            '7'  // state_refugee_main (Next p1)
                            , '9'  // state_refugee_main (Next p2)
                            , '6'  // state_refugee_main (Next p3)
                            , '3'  // state_refugee_main (Back p4)
                            , '7'  // state_refugee_main (Back p3)
                            , '10'  // state_refugee_main (Back p3)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. New to SA',
                                '2. The asylum application process',
                                '3. Asylum applications from children',
                                '4. Permits',
                                '5. Support services',
                                '6. Right to work',
                                '7. Next'
                            ].join('\n')
                        })
                        .run();
                });
            });
        });

        // TEST REDIS KEY EXPIRY

        describe("Redis expiry testing", function() {
            describe("when a user registers, then returns after state expiration", function() {
                it("should show them the main menu in their language", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_refugee_main'
                        })
                        // check user language is set
                        .check.user.properties({lang: 'fr'})
                        .run();
                });
            });
        });

        // TEST TIMEOUT REDIALING

        describe("Timeout redial testing", function() {
            describe("should not show timeout question for:", function() {
                it("state_language", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_language'
                        })
                        .run();
                });

                it("state_refugee_main", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_refugee_main'
                        })
                        .run();
                });

                it("state_migrant_main", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_migrant_main'
                        })
                        .run();
                });
            });

            describe("if the user was busy with registration and redials", function() {
                it("should display timeout continuation page in their language", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Would you like to continue where you left off?",
                                "1. Yes, continue",
                                "2. No, restart"
                            ].join('\n')
                        })
                        // check user language is set
                        .check.user.properties({lang: 'fr'})
                        .run();
                });

                describe("if they choose to continue", function() {
                    it("should go back to state they timed out", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out (continue)
                            )
                            .check.interaction({
                                state: 'state_status'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out (continue)
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 14);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out.transient'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.continue.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.continue.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.continue.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.continue.sum'].values, [1]);
                            })
                            .run();
                    });

                });

                describe("if they choose to restart", function() {
                    it("should take them back to language page", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out (restart)
                            )
                            .check.interaction({
                                state: 'state_language'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out (restart)
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 14);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out.transient'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.restart.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.restart.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.restart.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.restart.sum'].values, [1]);
                            })
                            .run();
                    });
                });
            });

            describe("if the user was already registered and redials", function() {
                it("should display timeout continuation page", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '1'  // state_status (who is refugee)
                            , '1'  // state_who_refugee (yes - refugee)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Would you like to continue where you left off?",
                                "1. Yes, continue",
                                "2. No, restart"
                            ].join('\n')
                        })
                        .run();
                });

                describe("if they choose to continue", function() {
                    it("should continue where they left off", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '1'  // state_status (who is refugee)
                                , '1'  // state_who_refugee (yes - refugee)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out (continue)
                            )
                            .check.interaction({
                                state: 'state_refugee_rights_info'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '1'  // state_status (who is refugee)
                                , '1'  // state_who_refugee (yes - refugee)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out (continue)
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 26);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1]);
                                assert.deepEqual(metrics['total.registrations.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.sum'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.sum'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.burundi.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.burundi.sum'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.burundi.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.burundi.sum'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out.transient'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.continue.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.continue.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.continue.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.continue.sum'].values, [1]);
                                assert.deepEqual(metrics['total.subscription_subscribe_success.last'].values, [1]);
                                assert.deepEqual(metrics['total.subscription_subscribe_success.sum'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to restart", function() {
                    it("should take them back to menu page", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '1'  // state_status (who is refugee)
                                , '1'  // state_who_refugee (yes - refugee)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out (restart)
                            )
                            .check.interaction({
                                state: 'state_refugee_main'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '1'  // state_status (who is refugee)
                                , '1'  // state_who_refugee (yes - refugee)
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out (restart)
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 26);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1]);
                                assert.deepEqual(metrics['total.registrations.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.sum'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.sum'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.burundi.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.burundi.sum'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.burundi.last'].values, [1]);
                                assert.deepEqual(metrics['total.registrations.refugee.burundi.sum'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out.transient'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.restart.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.restart.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.restart.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.restart.sum'].values, [1]);
                                assert.deepEqual(metrics['total.subscription_subscribe_success.last'].values, [1]);
                                assert.deepEqual(metrics['total.subscription_subscribe_success.sum'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
                            })
                            .run();
                    });
                });
            });

            describe("if the user times out on timeout page and redials", function() {
                it("should display timeout continuation page", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial again
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Would you like to continue where you left off?",
                                "1. Yes, continue",
                                "2. No, restart"
                            ].join('\n')
                        })
                        .run();
                });

                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial again
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 6);
                            assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2, 3]);
                            assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1, 1]);
                            // note metrics below do not increment twice - 'enter' doesn't happen twice
                            assert.deepEqual(metrics['total.reached_state_timed_out'].values, [1]);
                            assert.deepEqual(metrics['total.reached_state_timed_out.transient'].values, [1]);
                        })
                        .run();
                });

                it("should continue where they left off if chosen", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , '1'  // state_timed_out (yes)
                        )
                        .check.interaction({
                            state: 'state_status'
                        })
                        .run();
                });

                it("should take them back to language page if they start over", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , '2'  // state_timed_out (no)
                        )
                        .check.interaction({
                            state: 'state_language'
                        })
                        .run();
                });
            });
        });

        // TEST SENDING REDIAL REMINDER SMS

        describe("Redial reminder testing", function() {
            describe("if the user times out once during registration", function() {
                it("should send redial reminder sms", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                        )
                        .check(function(api) {
                            var smses = _.where(api.outbound.store, {
                                endpoint: 'sms'
                            });
                            assert.equal(smses.length, 1);
                        })
                        .run();
                });

                it("should save extras", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(contact.extra.dialback_reminder_sent, 'true');
                        })
                        .run();
                });
            });

            describe("if the user times out twice during registration", function() {
                it("should only send one redial reminder sms", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                        )
                        .check(function(api) {
                            var smses = _.where(api.outbound.store, {
                                endpoint: 'sms'
                            });
                            assert.equal(smses.length, 1);
                        })
                        .run();
                });

                it("should save extras", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , '5'  // state_country (burundi)
                            , {session_event: 'close'}  // may or may not work
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(contact.extra.dialback_reminder_sent, 'true');
                        })
                        .run();
                });
            });

            describe("if the user times out only after registration", function() {
                it("should not send a redial reminder sms", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '2'  // state_status (who is migrant)
                            , '1'  // state_who_migrant (yes - migrant)
                            , '2'  // state_migrant_rights_info (exit)
                            , {session_event: 'close'}  // may or may not work
                        )
                        .check(function(api) {
                            var smses = _.where(api.outbound.store, {
                                endpoint: 'sms'
                            });
                            assert.equal(smses.length, 0);
                        })
                        .run();
                });

                it("should not save extras", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '2'  // state_status (who is migrant)
                            , '1'  // state_who_migrant (yes - migrant)
                            , '2'  // state_migrant_rights_info (exit)
                            , {session_event: 'close'}  // may or may not work
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(contact.extra.dialback_reminder_sent, undefined);
                        })
                        .run();
                });
            });
        });

        // TEST REGISTRATION

        describe("Regisration testing", function() {

            describe("starting session", function() {
                it("should ask for their language", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: [
                                'Welcome! Find info about migrants, asylum, refugees & support services. Please choose your language:',
                                "1. English",
                                "2. French",
                                "3. Amharic",
                                "4. Swahili",
                                "5. Somali"
                            ].join('\n')
                        })
                        .run();
                });

                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 4);
                            assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1]);
                        })
                        .run();
                });

                it("should save extras", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 1);
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });
            });

            describe("upon language selection", function() {
                it("should ask for their country of origin", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language
                        )
                        .check.interaction({
                            state: 'state_country',
                            reply: [
                                'Select your country of origin:',
                                '1. Somalia',
                                '2. Ethiopia',
                                '3. Eritrea',
                                '4. Democratic Republic of Congo',
                                '5. Burundi',
                                '6. Kenya',
                                '7. Rwanda',
                                '8. Sudan/South Sudan',
                                '9. Next'
                            ].join('\n')
                        })
                        .run();
                });

                it("should save their language choice", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language
                        )
                        // check user extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.lang, 'fr');
                        })
                        // check user language is set
                        .check.user.properties({lang: 'fr'})
                        .run();
                });
            });

            describe("upon country selection", function() {
                it("should ask for their status", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                        )
                        .check.interaction({
                            state: 'state_status',
                            reply: [
                                'Are you a refugee or migrant?',
                                '1. Who is a refugee?',
                                '2. Who is a migrant?',
                                '3. I am neither'
                            ].join('\n')
                        })
                        .run();
                });

                it("should save their country choice", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 4);
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.lang, 'fr');
                            assert.equal(contact.extra.country, 'burundi');
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });
            });

            describe("upon status question selection", function() {
                describe("if the user selected refugee info", function() {
                    it("should show refugee info", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '1'  // state_status (who is refugee)
                            )
                            .check.interaction({
                                state: 'state_who_refugee',
                                reply: [
                                    'CONTENT 004',
                                    '1. Yes, I am a refugee',
                                    '2. No, back to menu'
                                ].join('\n')
                            })
                            .run();
                    });
                });

                describe("if the user selected migrant info", function() {
                    it("should show migrant info", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '2'  // state_status (who is migrant)
                            )
                            .check.interaction({
                                state: 'state_who_migrant',
                                reply: [
                                    'CONTENT 005',
                                    '1. Yes, I am a migrant',
                                    '2. No, back to menu'
                                ].join('\n')
                            })
                            .run();
                    });
                });

                // TODO: requires SOW update
                describe("if the user indicates they are neither refugee nor migrant", function() {
                    it("should do something", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language (french)
                                , '5'  // state_country (burundi)
                                , '3'  // state_status (neither)
                            )
                            .check.interaction({
                                state: 'state_neither',
                                reply: [
                                    'Unknown 01',
                                ].join('\n')
                            })
                            // check metrics
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 4);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1]);
                            })
                            // check user extras
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 5);
                                assert.equal(contact.extra.language, 'french');
                                assert.equal(contact.extra.lang, 'fr');
                                assert.equal(contact.extra.country, 'burundi');
                                assert.equal(contact.extra.status, 'neither');
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                            })
                            .run();
                    });
                });
            });

            describe("upon refugee status selection", function() {
                it("should show them info on using the system", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '1'  // state_status (who is refugee)
                            , '1'  // state_who_refugee (yes - refugee)
                        )
                        .check.interaction({
                            state: 'state_refugee_rights_info',
                            reply: [
                                'Welcome! This is a step-by-step guide for foreign nationals in South Africa. Read all the Menu options to find the help you need. Choose',
                                '1. More',
                                '2. Exit'
                            ].join('\n')
                        })
                        .run();
                });

                it("should fire metrics since they are now registered", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '1'  // state_status (who is refugee)
                            , '1'  // state_who_refugee (yes - refugee)
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 14);
                            assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.sum'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.refugee.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.refugee.sum'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.burundi.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.burundi.sum'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.refugee.burundi.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.refugee.burundi.sum'].values, [1]);
                            assert.deepEqual(metrics['total.subscription_subscribe_success.last'].values, [1]);
                            assert.deepEqual(metrics['total.subscription_subscribe_success.sum'].values, [1]);
                        })
                        .run();
                });

                it("should save their status choice", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '1'  // state_status (who is refugee)
                            , '1'  // state_who_refugee (yes - refugee)
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 5);
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.lang, 'fr');
                            assert.equal(contact.extra.country, 'burundi');
                            assert.equal(contact.extra.status, 'refugee');
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });

                it("should take them to refugee main menu if they choose exit", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '1'  // state_status (who is refugee)
                            , '1'  // state_who_refugee (yes - refugee)
                            , '2'  // state_refugee_rights_info (exit)
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. New to SA',
                                '2. The asylum application process',
                                '3. Asylum applications from children',
                                '4. Permits',
                                '5. Support services',
                                '6. Right to work',
                                '7. Next'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("upon migrant status selection", function() {
                it("should show them info on using the system", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '2'  // state_status (who is migrant)
                            , '1'  // state_who_migrant (yes - migrant)
                        )
                        .check.interaction({
                            state: 'state_migrant_rights_info',
                            reply: [
                                'Welcome! This is a step-by-step guide for foreign nationals in South Africa. Read all the Menu options to find the help you need. Choose',
                                '1. More',
                                '2. Exit'
                            ].join('\n')
                        })
                        .run();
                });

                it("should fire metrics since they are now registered", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '2'  // state_status (who is migrant)
                            , '1'  // state_who_migrant (yes - migrant)
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 14);
                            assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions'].values, [1]);
                            assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.sum'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.migrant.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.migrant.sum'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.burundi.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.burundi.sum'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.migrant.burundi.last'].values, [1]);
                            assert.deepEqual(metrics['total.registrations.migrant.burundi.sum'].values, [1]);
                            assert.deepEqual(metrics['total.subscription_subscribe_success.last'].values, [1]);
                            assert.deepEqual(metrics['total.subscription_subscribe_success.sum'].values, [1]);
                        })
                        .run();
                });

                it("should save their status choice", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '2'  // state_status (who is migrant)
                            , '1'  // state_who_migrant (yes - migrant)
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 5);
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.lang, 'fr');
                            assert.equal(contact.extra.country, 'burundi');
                            assert.equal(contact.extra.status, 'migrant');
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });

                it("should take them to migrant main menu if they choose exit", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '2'  // state_status (who is migrant)
                            , '1'  // state_who_migrant (yes - migrant)
                            , '2'  // state_migrant_rights_info (exit)
                        )
                        .check.interaction({
                            state: 'state_migrant_main',
                            reply: [
                                'MAIN MENU',
                                '1. New to SA',
                                '2. The visa application process',
                                '3. Unaccompanied / separated children',
                                '4. Support services',
                                '5. Employment',
                                '6. Healthcare',
                                '7. Next'
                            ].join('\n')
                        })
                        .run();
                });
            });
        });

        // TEST LOCATION FINDING
        describe("Location finder testing", function() {
            describe("when a user initialises location finding", function() {
                it("should ask them to enter their suburb", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                        )
                        .check.interaction({
                            state: 'state_locate_me',
                            reply:
                                "To find your closest SService we need to know what suburb or area u are in. Please be specific. e.g. Inanda Sandton",
                        })
                        .run();
                });
            });

            describe("when the user enters data that returns multiple location results", function() {
                it("should display a list of address options", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Quad Street'  // state_locate_me
                        )
                        .check.interaction({
                            state: 'state_locate_me',
                            reply: [
                                "Please select your location:",
                                "1. Suburb number 1, City number 1, WC",
                                "2. Suburb number 2, Town number 2, GP",
                                "3. Suburb number 3, City number 3, FS",
                                "n. More",
                                "p. Back"
                            ].join('\n')
                        })
                        .run();
                });

                it("should go the next page if 'n' is chosen", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Quad Street'  // state_locate_me
                            , 'n'  // state_locate_me
                        )
                        .check.interaction({
                            state: 'state_locate_me',
                            reply: [
                                "Please select your location:",
                                "1. Suburb number 4, KZN",
                                "n. More",
                                "p. Back"
                            ].join('\n')
                        })
                        .run();
                });

                it("should save data to contact upon choice", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Quad Street'  // state_locate_me
                            , '3'  // state_locate_me
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                                msisdn: '+064001'
                                            });
                            assert.equal(contact.extra['location:formatted_address'],
                                'Suburb number 3, City number 3, FS');
                            assert.equal(contact.extra['location:lon'], '3.1415');
                            assert.equal(contact.extra['location:lat'], '2.7182');
                            assert.equal(contact.extra['location:suburb'], 'Suburb number 3');
                            assert.equal(contact.extra['location:city'], 'City number 3');
                            assert.equal(contact.extra['location:province'], 'FS');
                        })
                        .run();
                });

                it("should save data to contact upon choice if info missing", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Quad Street'  // state_locate_me
                            , 'n'  // state_locate_me
                            , '1'
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                                msisdn: '+064001'
                                            });
                            assert.equal(contact.extra['location:formatted_address'],
                                'Suburb number 4, n/a, KZN');
                            assert.equal(contact.extra['location:lon'], '3.1415');
                            assert.equal(contact.extra['location:lat'], '2.7182');
                            assert.equal(contact.extra['location:suburb'], 'Suburb number 4');
                            assert.equal(contact.extra['location:city'], 'n/a');
                            assert.equal(contact.extra['location:province'], 'KZN');
                        })
                        .run();
                });

                it("should stall them", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Quad Street'  // state_locate_me
                            , '3'  // state_locate_me
                        )
                        .check.interaction({
                            state: 'state_locate_stall_initial',
                            reply: [
                                "The system is looking up services near you. This usually takes less than a minute.",
                                "1. View services"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user enters data that returns 1 location result", function() {
                it("should stall them", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Friend Street'  // state_locate_me
                        )
                        .check.interaction({
                            state: 'state_locate_stall_initial',
                            reply: [
                                "The system is looking up services near you. This usually takes less than a minute.",
                                "1. View services"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the nearest SService locations have been found", function() {
                it("should let them select the options for more info", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Friend Street'  // state_locate_me
                            , '1'  // state_locate_stall_initial
                        )
                        .check.interaction({
                            state: 'state_locate_show_results',
                            reply: [
                                "Select a service for more info",
                                "1. Mowbray Police station",
                                "2. Turkmenistan Police station"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user tries to view service locations too quickly", function() {
                it("should stall them again", function() {
                    return tester
                        .setup.user.addr('064003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Friend Street'  // state_locate_me
                            , '1'  // state_locate_stall_initial
                        )
                        .check.interaction({
                            state: 'state_locate_stall_again',
                            reply: [
                                "The system was still busy finding your services. Please try again now or choose Exit and dial back later.",
                                "1. View services",
                                "2. Exit"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user decides to exit rather than retry", function() {
                it("should exit, remind to redial later", function() {
                    return tester
                        .setup.user.addr('064003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Friend Street'  // state_locate_me
                            , '1'  // state_locate_stall_initial
                            , '2'  // state_locate_stall_again
                        )
                        .check.interaction({
                            state: 'state_locate_exit',
                            reply: 'Please dial back in a few minutes to see your services results'
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("when the user dials back to retry location finding", function() {
                it("should show them stalling state", function() {
                    return tester
                        .setup.user.addr('064003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_refugee_main (support services)
                            , '1'  // state_024 (find nearest SService)
                            , 'Friend Street'  // state_locate_me
                            , '1'  // state_locate_stall_initial
                            , '2'  // state_locate_stall_again
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_locate_stall_again'
                        })
                        .run();
                });
            });
        });

        // TEST NAVIGATION FROM MIGRANT MAIN MENU

        describe("Migrant menu navigation testing", function() {

            describe("When navigating away from the migrant main menu", function() {
                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_migrant_main
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.migrant.state_060.last'].values, [1]);
                            assert.deepEqual(metrics['total.migrant.state_060.sum'].values, [1]);
                        })
                        .run();
                });
            });

            it("starting a new session - main menu", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                    )
                    .check.interaction({
                        state: 'state_migrant_main'
                    })
                    .run();
            });

            it("migrant menu - 060", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '1'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_060'
                    })
                    .run();
            });

                it("060 - 100", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_migrant_main
                            , '1'  // state_060
                        )
                        .check.interaction({
                            state: 'state_100'
                        })
                        .run();
                });

                it("060 - 101", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_migrant_main
                            , '2'  // state_060
                        )
                        .check.interaction({
                            state: 'state_101'
                        })
                        .run();
                });

            it("migrant menu - 061", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '2'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_061'
                    })
                    .run();
            });

                it("061 - 102", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '2'  // state_migrant_main
                            , '1'  // state_061
                        )
                        .check.interaction({
                            state: 'state_102'
                        })
                        .run();
                });

                it("060 - 103", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '2'  // state_migrant_main
                            , '2'  // state_061
                        )
                        .check.interaction({
                            state: 'state_103'
                        })
                        .run();
                });

                it("061 - 104", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '2'  // state_migrant_main
                            , '3'  // state_061
                        )
                        .check.interaction({
                            state: 'state_104'
                        })
                        .run();
                });

                    it("104 - 150", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '1'  // state_104
                            )
                            .check.interaction({
                                state: 'state_150'
                            })
                            .run();
                    });

                    it("104 - 151", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '2'  // state_104
                            )
                            .check.interaction({
                                state: 'state_151'
                            })
                            .run();
                    });

                    it("104 - 152", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '3'  // state_104
                            )
                            .check.interaction({
                                state: 'state_152'
                            })
                            .run();
                    });

                    it("104 - 153", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '4'  // state_104
                            )
                            .check.interaction({
                                state: 'state_153'
                            })
                            .run();
                    });

                    it("104 - 154", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '5'  // state_104
                            )
                            .check.interaction({
                                state: 'state_154'
                            })
                            .run();
                    });

                    it("104 - 155", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '6'  // state_104
                            )
                            .check.interaction({
                                state: 'state_155'
                            })
                            .run();
                    });

                    it("104 - 156", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '7'  // state_104
                            )
                            .check.interaction({
                                state: 'state_156'
                            })
                            .run();
                    });

                    it("104 - 157", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '8'  // state_104
                            )
                            .check.interaction({
                                state: 'state_157'
                            })
                            .run();
                    });

                    it("104 - 158", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '9'  // state_104 (next page)
                                , '1'  // state_104
                            )
                            .check.interaction({
                                state: 'state_158'
                            })
                            .run();
                    });

                    it("104 - 159", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '9'  // state_104 (next page)
                                , '2'  // state_104
                            )
                            .check.interaction({
                                state: 'state_159'
                            })
                            .run();
                    });

                    it("104 - 160", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '9'  // state_104 (next page)
                                , '3'  // state_104
                            )
                            .check.interaction({
                                state: 'state_160'
                            })
                            .run();
                    });

                    it("104 - 161", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '9'  // state_104 (next page)
                                , '4'  // state_104
                            )
                            .check.interaction({
                                state: 'state_161'
                            })
                            .run();
                    });

                    it("104 - 162", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '9'  // state_104 (next page)
                                , '5'  // state_104
                            )
                            .check.interaction({
                                state: 'state_162'
                            })
                            .run();
                    });

                    it("104 - 163", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '2'  // state_migrant_main
                                , '3'  // state_061
                                , '9'  // state_104 (next page)
                                , '6'  // state_104 (next page)
                                , '1'
                            )
                            .check.interaction({
                                state: 'state_163'
                            })
                            .run();
                    });

                it("061 - 105", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '2'  // state_migrant_main
                            , '4'  // state_061
                        )
                        .check.interaction({
                            state: 'state_105'
                        })
                        .run();
                });

            it("migrant menu - 062", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '3'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_062'
                    })
                    .run();
            });

            it("migrant menu - 063", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '4'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_063'
                    })
                    .run();
            });

                it("063 - 106", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '4'  // state_migrant_main
                            , '1'  // state_063
                        )
                        .check.interaction({
                            state: 'state_106'
                        })
                        .run();
                });

                it("063 - 107", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '4'  // state_migrant_main
                            , '2'  // state_063
                        )
                        .check.interaction({
                            state: 'state_107'
                        })
                        .run();
                });

                it("063 - 108", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '4'  // state_migrant_main
                            , '3'  // state_063
                        )
                        .check.interaction({
                            state: 'state_108'
                        })
                        .run();
                });

                it("063 - 109", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '4'  // state_migrant_main
                            , '4'  // state_063
                        )
                        .check.interaction({
                            state: 'state_109'
                        })
                        .run();
                });

                it("063 - 110", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '4'  // state_migrant_main
                            , '5'  // state_063
                        )
                        .check.interaction({
                            state: 'state_110'
                        })
                        .run();
                });

            it("migrant menu - 064", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '5'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_064'
                    })
                    .run();
            });

                it("064 - 111", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '1'  // state_064
                        )
                        .check.interaction({
                            state: 'state_111'
                        })
                        .run();
                });

                it("064 - 112", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '2'  // state_064
                        )
                        .check.interaction({
                            state: 'state_112'
                        })
                        .run();
                });

                it("064 - 113", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '3'  // state_064
                        )
                        .check.interaction({
                            state: 'state_113'
                        })
                        .run();
                });

                it("064 - 079", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '4'  // state_064
                        )
                        .check.interaction({
                            state: 'state_079'
                        })
                        .run();
                });

                    it("079 - 164", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '4'  // state_064
                                , '1'  // state_079
                            )
                            .check.interaction({
                                state: 'state_164'
                            })
                            .run();
                    });

                    it("079 - 114", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '4'  // state_064
                                , '2'  // state_079
                            )
                            .check.interaction({
                                state: 'state_114'
                            })
                            .run();
                    });

                    it("079 - 115", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '4'  // state_064
                                , '3'  // state_079
                            )
                            .check.interaction({
                                state: 'state_115'
                            })
                            .run();
                    });

                    it("079 - 116", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '4'  // state_064
                                , '4'  // state_079
                            )
                            .check.interaction({
                                state: 'state_116'
                            })
                            .run();
                    });

                    it("079 - 117", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '4'  // state_064
                                , '5'  // state_079
                            )
                            .check.interaction({
                                state: 'state_117'
                            })
                            .run();
                    });

                    it("079 - 118", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '4'  // state_064
                                , '6'  // state_079
                            )
                            .check.interaction({
                                state: 'state_118'
                            })
                            .run();
                    });

                it("064 - 080", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '5'  // state_064
                        )
                        .check.interaction({
                            state: 'state_080'
                        })
                        .run();
                });

                    it("080 - 119", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '5'  // state_064
                                , '1'  // state_080
                            )
                            .check.interaction({
                                state: 'state_119'
                            })
                            .run();
                    });

                    it("080 - 120", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '5'  // state_064
                                , '2'  // state_080
                            )
                            .check.interaction({
                                state: 'state_120'
                            })
                            .run();
                    });

                    it("080 - 121", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '5'  // state_064
                                , '3'  // state_080
                            )
                            .check.interaction({
                                state: 'state_121'
                            })
                            .run();
                    });

                    it("080 - 122", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '5'  // state_migrant_main
                                , '5'  // state_064
                                , '4'  // state_080
                            )
                            .check.interaction({
                                state: 'state_122'
                            })
                            .run();
                    });


                it("064 - 123", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '6'  // state_064 (next)
                            , '1'  // state_064
                        )
                        .check.interaction({
                            state: 'state_123'
                        })
                        .run();
                });

                it("064 - 124", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '5'  // state_migrant_main
                            , '6'  // state_064 (next)
                            , '2'  // state_064
                        )
                        .check.interaction({
                            state: 'state_124'
                        })
                        .run();
                });

            it("migrant menu - 065", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '6'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_065'
                    })
                    .run();
            });

                it("065 - 125", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '1'  // state_065
                        )
                        .check.interaction({
                            state: 'state_125'
                        })
                        .run();
                });

                it("065 - 126", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '2'  // state_065
                        )
                        .check.interaction({
                            state: 'state_126'
                        })
                        .run();
                });

                it("065 - 127", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '3'  // state_065
                        )
                        .check.interaction({
                            state: 'state_127'
                        })
                        .run();
                });

                it("065 - 128", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '4'  // state_065
                        )
                        .check.interaction({
                            state: 'state_128'
                        })
                        .run();
                });

                it("065 - 129", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '5'  // state_065
                        )
                        .check.interaction({
                            state: 'state_129'
                        })
                        .run();
                });

                it("065 - 130", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '6'  // state_065
                        )
                        .check.interaction({
                            state: 'state_130'
                        })
                        .run();
                });

                    it("130 - 131", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '6'  // state_migrant_main
                                , '6'  // state_065
                                , '1'  // state_130
                            )
                            .check.interaction({
                                state: 'state_131'
                            })
                            .run();
                    });

                    it("130 - 132", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '6'  // state_migrant_main
                                , '6'  // state_065
                                , '2'  // state_130
                            )
                            .check.interaction({
                                state: 'state_132'
                            })
                            .run();
                    });

                    it("130 - 133", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '6'  // state_migrant_main
                                , '6'  // state_065
                                , '3'  // state_130
                            )
                            .check.interaction({
                                state: 'state_133'
                            })
                            .run();
                    });

                it("065 - 134", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '6'  // state_migrant_main
                            , '7'  // state_065 (next)
                            , '1'  // state_065
                        )
                        .check.interaction({
                            state: 'state_134'
                        })
                        .run();
                });

            it("migrant menu - 066", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '7'  // state_migrant_main (next)
                        , '1'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_066'
                    })
                    .run();
            });

                it("066 - 135", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '1'  // state_migrant_main
                            , '1'  // state_066
                        )
                        .check.interaction({
                            state: 'state_135'
                        })
                        .run();
                });

                it("066 - 136", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '1'  // state_migrant_main
                            , '2'  // state_066
                        )
                        .check.interaction({
                            state: 'state_136'
                        })
                        .run();
                });

                it("066 - 137", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '1'  // state_migrant_main
                            , '3'  // state_066
                        )
                        .check.interaction({
                            state: 'state_137'
                        })
                        .run();
                });

                it("066 - 138", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '1'  // state_migrant_main
                            , '4'  // state_066
                        )
                        .check.interaction({
                            state: 'state_138'
                        })
                        .run();
                });

                it("066 - 139", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '1'  // state_migrant_main
                            , '5'  // state_066
                        )
                        .check.interaction({
                            state: 'state_139'
                        })
                        .run();
                });

                it("066 - 140", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '1'  // state_migrant_main
                            , '6'  // state_066
                        )
                        .check.interaction({
                            state: 'state_140'
                        })
                        .run();
                });

            it("migrant menu - 067", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '7'  // state_migrant_main (next)
                        , '2'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_067'
                    })
                    .run();
            });

            it("migrant menu - 068", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '7'  // state_migrant_main (next)
                        , '3'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_068'
                    })
                    .run();
            });

            it("migrant menu - 069", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '7'  // state_migrant_main (next)
                        , '4'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_069'
                    })
                    .run();
            });

                it("069 - 141", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '4'  // state_migrant_main
                            , '1'  // state_069
                        )
                        .check.interaction({
                            state: 'state_141'
                        })
                        .run();
                });

                it("069 - 142", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '4'  // state_migrant_main
                            , '2'  // state_069
                        )
                        .check.interaction({
                            state: 'state_142'
                        })
                        .run();
                });

                it("069 - 143", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '4'  // state_migrant_main
                            , '3'  // state_069
                        )
                        .check.interaction({
                            state: 'state_143'
                        })
                        .run();
                });

                it("069 - 144", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '4'  // state_migrant_main
                            , '4'  // state_069
                        )
                        .check.interaction({
                            state: 'state_144'
                        })
                        .run();
                });

            it("migrant menu - 070", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '7'  // state_migrant_main (next)
                        , '5'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_070'
                    })
                    .run();
            });

                it("070 - 145", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '5'  // state_migrant_main
                            , '1'  // state_070
                        )
                        .check.interaction({
                            state: 'state_145'
                        })
                        .run();
                });

            it("migrant menu - 071", function() {
                return tester
                    .setup.user.addr('064002')
                    .inputs(
                        {session_event: 'new'}  // dial in first time
                        , '7'  // state_migrant_main (next)
                        , '6'  // state_migrant_main
                    )
                    .check.interaction({
                        state: 'state_071'
                    })
                    .run();
            });

                it("migrant menu - 146", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '6'  // state_migrant_main
                            , '1'  // state_071
                        )
                        .check.interaction({
                            state: 'state_146'
                        })
                        .run();
                });

                it("migrant menu - 147", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '6'  // state_migrant_main
                            , '2'  // state_071
                        )
                        .check.interaction({
                            state: 'state_147'
                        })
                        .run();
                });

                it("migrant menu - 148", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '6'  // state_migrant_main
                            , '3'  // state_071
                        )
                        .check.interaction({
                            state: 'state_148'
                        })
                        .run();
                });

                it("migrant menu - 149", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '7'  // state_migrant_main (next)
                            , '6'  // state_migrant_main
                            , '4'  // state_071
                        )
                        .check.interaction({
                            state: 'state_149'
                        })
                        .run();
                });
        });

        // TEST RETURNING USER METRICS

        describe("Returning user metrics & extras testing", function() {
            describe("when a new user logs on", function() {
                it("should update extra.last_seen", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+082111',
                                extra : {},
                                key: "contact_key",
                                user_account: "contact_user_account"
                            });
                        })
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // check metrics
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.returning_users.last'], undefined);
                        })
                        // check extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 1);
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });
            });

            describe("when an unregistered user returns", function() {
                it("should update extra.last_seen", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+082111',
                                extra : {
                                    last_seen: '2015-03-03'  // 31d ago
                                },
                                key: "contact_key",
                                user_account: "contact_user_account"
                            });
                        })
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        // check metrics
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.returning_users.last'], undefined);
                        })
                        // check extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 4);
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                            assert.equal(contact.extra.lang, 'fr');
                            assert.equal(contact.extra.language, 'french');
                        })
                        .run();
                });
            });

            describe("when a user returns the first time after registering", function() {
                it("should fire returning user metric", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+082111',
                                extra : {},
                                key: "contact_key",
                                user_account: "contact_user_account"
                            });
                        })
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '5'  // state_country (burundi)
                            , '1'  // state_status (who is refugee)
                            , '1'  // state_who_refugee (yes - refugee)
                            , '3'  // state_refugee_rights_info (exit)
                            , {session_event: 'close'}
                            , {session_event: 'new'}  // redial
                        )
                        // check metrics
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 18);
                            assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
                            assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
                        })
                        // check extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 7);
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                            assert.equal(contact.extra.last_returning_metric_fire, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });
            });

            describe("when a registered user returns after less than a week", function() {
                it("should not fire returning user metrics", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // check metrics
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 4);
                            assert.deepEqual(metrics['total.returning_users.last'], undefined);
                        })
                        // check extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+064002'
                            });
                            assert.equal(Object.keys(contact.extra).length, 6);
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                            assert.equal(contact.extra.last_returning_metric_fire, '2015-03-31 12:00:00.000');
                        })
                        .run();
                });
            });

            describe("when a registered user returns after more than a week", function() {
                it("should fire returning user metrics", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // check metrics
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 6);
                            assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
                            assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
                        })
                        // check extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+064001'
                            });
                            assert.equal(Object.keys(contact.extra).length, 6);
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                            assert.equal(contact.extra.last_returning_metric_fire, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });
            });
        });

    });
});
