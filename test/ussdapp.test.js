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
                    channel: '*120*8864*0000#',
                    testing_today: '2015-04-03 06:07:08.999',
                    metric_store: 'refugeerights_test',  // _env at the end
                    control: {
                        username: "test_user",
                        api_key: "test_key",
                        url: "http://127.0.0.1:8000/subscription/"
                    },
                    location_api_url: "http://location_fixture/poifinder/",
                    poi_types: ['lawyer', 'police'],
                    template: "Nearby services: {{ results }}.",  // SMS template
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    snappy: {
                        "endpoint": "https://app.besnappy.com/api/v1/",
                        "username": "980d2423-292b-4c34-be81-c74784b9e99a",
                        "account_id": "1",
                        "default_faq": "1",
                        "faq_id": {
                            "refugee_step1": "11",
                            "refugee_step2": "12",
                            "refugee_tips": "13",
                            "refugee_about": "14",
                            "migrant_step1": "21",
                            "migrant_step2": "22",
                            "migrant_about": "23"
                        }
                    },
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

        // describe("PaginatedChoiceState testing using Refugee Main Menu", function() {
        //     describe("forward navigation", function() {
        //         it("should display page 2 on Next", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .setup.user.state('state_refugee_main')
        //                 .inputs(
        //                     '7'  // state_refugee_main (Next)
        //                 )
        //                 .check.interaction({
        //                     state: 'state_refugee_main',
        //                     reply: [
        //                         'MAIN MENU',
        //                         '1. Health rights',
        //                         '2. Education',
        //                         '3. Social services',
        //                         '4. Banking',
        //                         '5. Tips',
        //                         '6. Useful contacts',
        //                         '7. Safety concerns',
        //                         '8. Statelessness',
        //                         '9. Next',
        //                         '10. Back'
        //                     ].join('\n')
        //                 })
        //                 .run();
        //         });

        //         it("should display page 3 on Next", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .setup.user.state('state_refugee_main')
        //                 .inputs(
        //                     '7'  // state_refugee_main (Next p1)
        //                     , '9'  // state_refugee_main (Next p2)
        //                 )
        //                 .check.interaction({
        //                     state: 'state_refugee_main',
        //                     reply: [
        //                         'MAIN MENU',
        //                         '1. LGBTI rights',
        //                         '2. Violence against women & children',
        //                         '3. Word definitions',
        //                         '4. Change settings',
        //                         '5. Ts & Cs of this service',
        //                         '6. About LHR',
        //                         '7. Back'
        //                     ].join('\n')
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("backward navigation", function() {
        //         it("should display page 2 on Back", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .setup.user.state('state_refugee_main')
        //                 .inputs(
        //                     '7'  // state_refugee_main (Next p1)
        //                     , '9'  // state_refugee_main (Next p2)
        //                     , '7'  // state_refugee_main (Back p3)
        //                 )
        //                 .check.interaction({
        //                     state: 'state_refugee_main',
        //                     reply: [
        //                         'MAIN MENU',
        //                         '1. Health rights',
        //                         '2. Education',
        //                         '3. Social services',
        //                         '4. Banking',
        //                         '5. Tips',
        //                         '6. Useful contacts',
        //                         '7. Safety concerns',
        //                         '8. Statelessness',
        //                         '9. Next',
        //                         '10. Back'
        //                     ].join('\n')
        //                 })
        //                 .run();
        //         });

        //         it("should display page 1 on Back", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .setup.user.state('state_refugee_main')
        //                 .inputs(
        //                     '7'  // state_refugee_main (Next p1)
        //                     , '9'  // state_refugee_main (Next p2)
        //                     , '7'  // state_refugee_main (Back p3)
        //                     , '10'  // state_refugee_main (Back p2)
        //                 )
        //                 .check.interaction({
        //                     state: 'state_refugee_main',
        //                     reply: [
        //                         'MAIN MENU',
        //                         '1. Refugee definitions',
        //                         '2. Asylum applications',
        //                         '3. Asylum applications: children',
        //                         '4. Permits',
        //                         '5. Support services',
        //                         '6. Right to work',
        //                         '7. Next'
        //                     ].join('\n')
        //                 })
        //                 .run();
        //         });
        //     });
        // });

        // TEST REDIS KEY EXPIRY

        describe("Redis expiry testing", function() {
            describe("when a registered user returns after state expiration", function() {
                it("should show them state_registered_landing in their language", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_registered_landing'
                        })
                        // check user language is set
                        .check.user.properties({lang: 'fr'})
                        .run();
                });
            });

            describe("if they choose an option on state_registered_landing", function() {
                it("should navigate to 1. main", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - more info
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_refugee_main'
                        })
                        .run();
                });

                it("should navigate to 2. state_report_legal", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_registered_landing - report xenophobia
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_report_legal'
                        })
                        .run();
                });

                it("should navigate to 3. state_report_legal", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_registered_landing - report arrest
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_report_legal'
                        })
                        .run();
                });

                it("should navigate to 4. state_report_legal", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '4'  // state_registered_landing - report corruption
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_report_legal'
                        })
                        .run();
                });

                it("should navigate to 5. state_report_legal", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // state_registered_landing - report other
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_report_legal'
                        })
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

                it("state_registered_landing", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_registered_landing'
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
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Select an option:",
                                "1. Return to where I left off",
                                "2. Find more info",
                                "3. Report xenophobia",
                                "4. Report unlawful arrest",
                                "5. Report corruption",
                                "6. Report something else"
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
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out (continue)
                            )
                            .check.interaction({
                                state: 'state_ref_mig_1'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
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

                describe("if they choose more info", function() {
                    it("should take them back to country page", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out - find more info
                            )
                            .check.interaction({
                                state: 'state_country'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out - find more info
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
                                assert.deepEqual(metrics['total.redials.info.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.info.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.info.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.info.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to report xenophobia", function() {
                    it("should go to state_report_legal", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '3'  // state_timed_out - report xenophobia
                            )
                            .check.interaction({
                                state: 'state_report_legal'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '3'  // state_timed_out - report xenophobia
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
                                assert.deepEqual(metrics['total.redials.xenophobia.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.xenophobia.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.xenophobia.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.xenophobia.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to report arrest", function() {
                    it("should go to state_report_legal", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '4'  // state_timed_out - report arrest
                            )
                            .check.interaction({
                                state: 'state_report_legal'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '4'  // state_timed_out - report arrest
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
                                assert.deepEqual(metrics['total.redials.arrest.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.arrest.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.arrest.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.arrest.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to report corruption", function() {
                    it("should go to state_report_legal", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '5'  // state_timed_out - report corruption
                            )
                            .check.interaction({
                                state: 'state_report_legal'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '5'  // state_timed_out - report corruption
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
                                assert.deepEqual(metrics['total.redials.corruption.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.corruption.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.corruption.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.corruption.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to report other", function() {
                    it("should go to state_report_legal", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '6'  // state_timed_out - report other
                            )
                            .check.interaction({
                                state: 'state_report_legal'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '6'  // state_timed_out - report other
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
                                assert.deepEqual(metrics['total.redials.other.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.other.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.other.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.unregistered.other.sum'].values, [1]);
                            })
                            .run();
                    });
                });
            });

            describe("if the user was already registered as refugee and redials", function() {
                it("should display timeout continuation page", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_registered_landing - report xenophobia
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Select an option:",
                                "1. Return to where I left off",
                                "2. Find more info",
                                "3. Report xenophobia",
                                "4. Report unlawful arrest",
                                "5. Report corruption",
                                "6. Report something else"
                            ].join('\n')
                        })
                        .run();
                });

                describe("if they choose to continue", function() {
                    it("should continue where they left off", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out - continue
                            )
                            .check.interaction({
                                state: 'state_report_legal'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out - continue
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 16);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1]);
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
                                assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to restart", function() {
                    it("should take them back to menu page", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out - restart
                            )
                            .check.interaction({
                                state: 'state_refugee_main'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out - restart
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.refugeerights_test;
                                assert.equal(Object.keys(metrics).length, 16);
                                assert.deepEqual(metrics['total.ussd.unique_users'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.unique_users.transient'].values, [1]);
                                assert.deepEqual(metrics['total.ussd.sessions'].values, [1, 2]);
                                assert.deepEqual(metrics['total.ussd.sessions.transient'].values, [1, 1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out'].values, [1]);
                                assert.deepEqual(metrics['total.reached_state_timed_out.transient'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.choice_made.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.info.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.info.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.info.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.refugee.info.sum'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
                                assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
                            })
                            .run();
                    });
                });
            });

            describe("if the user was already registered as migrant and redials", function() {
                it("should display timeout continuation page", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_registered_landing - report xenophobia
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Select an option:",
                                "1. Return to where I left off",
                                "2. Find more info",
                                "3. Report xenophobia",
                                "4. Report unlawful arrest",
                                "5. Report corruption",
                                "6. Report something else"
                            ].join('\n')
                        })
                        .run();
                });

                describe("if they choose to continue", function() {
                    it("should continue where they left off", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out - continue
                            )
                            .check.interaction({
                                state: 'state_report_legal'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '1'  // state_timed_out - continue
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
                                assert.deepEqual(metrics['total.redials.migrant.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.migrant.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.continue.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.continue.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.migrant.continue.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.migrant.continue.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("if they choose to restart", function() {
                    it("should take them back to menu page", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out - restart
                            )
                            .check.interaction({
                                state: 'state_migrant_main'
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('064002')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , {session_event: 'close'}  // may or may not work
                                , {session_event: 'new'}  // redial
                                , '2'  // state_timed_out - restart
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
                                assert.deepEqual(metrics['total.redials.migrant.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.migrant.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.info.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.info.sum'].values, [1]);
                                assert.deepEqual(metrics['total.redials.migrant.info.last'].values, [1]);
                                assert.deepEqual(metrics['total.redials.migrant.info.sum'].values, [1]);
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
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial again
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                "Select an option:",
                                "1. Return to where I left off",
                                "2. Find more info",
                                "3. Report xenophobia",
                                "4. Report unlawful arrest",
                                "5. Report corruption",
                                "6. Report something else"
                            ].join('\n')
                        })
                        .run();
                });

                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
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
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , '1'  // state_timed_out - continue
                        )
                        .check.interaction({
                            state: 'state_ref_mig_1'
                        })
                        .run();
                });

                it("should take them back to country page if they start over", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // may or may not work
                            , {session_event: 'new'}  // redial
                            , '2'  // state_timed_out - find more info
                        )
                        .check.interaction({
                            state: 'state_country'
                        })
                        .run();
                });
            });
        });

        // TEST SENDING REDIAL REMINDER SMS

        // describe("Redial reminder testing", function() {
        //     describe("if the user times out once during registration", function() {
        //         it("should send redial reminder sms", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , '5'  // state_country - burundi
        //                     , {session_event: 'close'}  // may or may not work
        //                 )
        //                 .check(function(api) {
        //                     var smses = _.where(api.outbound.store, {
        //                         endpoint: 'sms'
        //                     });
        //                     assert.equal(smses.length, 1);
        //                 })
        //                 .run();
        //         });

        //         it("should save extras", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , '5'  // state_country - burundi
        //                     , {session_event: 'close'}  // may or may not work
        //                 )
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+082111'
        //                     });
        //                     assert.equal(contact.extra.dialback_reminder_sent, 'true');
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("if the user times out twice during registration", function() {
        //         it("should only send one redial reminder sms", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , {session_event: 'close'}  // may or may not work
        //                     , {session_event: 'new'}  // redial
        //                     , '5'  // state_country - burundi
        //                     , {session_event: 'close'}  // may or may not work
        //                 )
        //                 .check(function(api) {
        //                     var smses = _.where(api.outbound.store, {
        //                         endpoint: 'sms'
        //                     });
        //                     assert.equal(smses.length, 1);
        //                 })
        //                 .run();
        //         });

        //         it("should save extras", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , {session_event: 'close'}  // may or may not work
        //                     , {session_event: 'new'}  // redial
        //                     , '5'  // state_country - burundi
        //                     , {session_event: 'close'}  // may or may not work
        //                 )
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+082111'
        //                     });
        //                     assert.equal(contact.extra.dialback_reminder_sent, 'true');
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("if the user times out only after registration", function() {
        //         it("should not send a redial reminder sms", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , '5'  // state_country - burundi
        //                     , '4'  // state_status (migrant)
        //                     , '2'  // state_migrant_rights_info (exit)
        //                     , {session_event: 'close'}  // may or may not work
        //                 )
        //                 .check(function(api) {
        //                     var smses = _.where(api.outbound.store, {
        //                         endpoint: 'sms'
        //                     });
        //                     assert.equal(smses.length, 0);
        //                 })
        //                 .run();
        //         });

        //         it("should not save extras", function() {
        //             return tester
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , '5'  // state_country - burundi
        //                     , '4'  // state_status (migrant)
        //                     , '2'  // state_migrant_rights_info (exit)
        //                     , {session_event: 'close'}  // may or may not work
        //                 )
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+082111'
        //                     });
        //                     assert.equal(contact.extra.dialback_reminder_sent, undefined);
        //                 })
        //                 .run();
        //         });
        //     });
        // });

        // TEST REGISTRATION

        describe("Registration testing", function() {

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
                                "Welcome! Would you like to find out about refugee and migrant rights in SA? First select your language:",
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
                            assert.equal(Object.keys(contact.extra).length, 3);
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.lang, 'fr');
                        })
                        // check user language is set
                        .check.user.properties({lang: 'fr'})
                        .run();
                });

                it("should navigate to consent menu", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [
                                "To give you the info & help you need, we will:",
                                "- Store your cell #, language & country of origin",
                                "- Sometimes send u SMSs",
                                "Do you consent to this?",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("upon consent selection", function() {
                describe("if the give consent", function() {
                    it("should navigate to unregistered menu", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                            )
                            .check.interaction({
                                state: 'state_unregistered_menu',
                                reply: [
                                    "Select an option:",
                                    "1. Find info about refugee/migrant rights in SA",
                                    "2. Report xenophobia",
                                    "3. Report unlawful arrest",
                                    "4. Report corruption",
                                    "5. Report something else"
                                ].join('\n')
                            })
                            .run();
                    });

                    it("should save extras", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                            )
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 4);
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                            })
                            .run();
                    });
                });

                describe("if they deny consent", function() {
                    it("should navigate to consent required state", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '2'  // state_consent - deny consent
                            )
                            .check.interaction({
                                state: 'state_consent_required',
                                reply: [
                                    "We're sorry, we can't help without you providing consent to us storing your info & sending you SMSs. What would you like to do?",
                                    "1. Go back to consent",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });
                });
            });

            describe("if they deny consent initially", function() {
                describe("if they then give consent", function() {
                    it("should go to state_consent", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '2'  // state_consent - deny consent
                                , '1'  // state_consent_required - consent
                            )
                            .check.interaction({
                                state: 'state_consent'
                            })
                            .run();
                    });
                });

                describe("if they Exit", function() {
                    it("should go to state_report_end", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '2'  // state_consent - deny consent
                                , '2'  // state_consent_required - exit
                            )
                            .check.interaction({
                                state: 'state_report_end'
                            })
                            .check.reply.ends_session()
                            .run();
                    });
                });
            });

            describe("upon unregistered menu option selection", function() {
                it("should navigate to 1. state_country", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                        )
                        .check.interaction({
                            state: 'state_country',
                            reply: [
                                "Select your country of origin:",
                                "1. Somalia",
                                "2. Ethiopia",
                                "3. Eritrea",
                                "4. Democratic Republic of Congo",
                                "5. Burundi",
                                "6. Kenya",
                                "7. Rwanda",
                                "8. Sudan/South Sudan",
                                "9. Next"
                            ].join('\n')
                        })
                        .run();
                });

                it("should navigate to 2. state_report_legal", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '2'  // state_unregistered_menu - report xenophobia
                        )
                        .check.interaction({
                            state: 'state_report_legal',
                            reply: [
                                "Reports are used to see where attacks may be in an area & warn others. LHR treats reports as serious. All rights reserved.",
                                "1. I understand",
                                "2. Exit"
                            ].join('\n')
                        })
                        .run();
                });

                it("should navigate to 3. state_report_legal", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '3'  // state_unregistered_menu - report arrest
                        )
                        .check.interaction({
                            state: 'state_report_legal',
                            reply: [
                                "LHR treats these reports as serious & will try to respond to critical reports as soon as possible. All rights reserved.",
                                "1. I understand",
                                "2. Exit"
                            ].join('\n')
                        })
                        .run();
                });

                it("should navigate to 4. state_report_legal", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '4'  // state_unregistered_menu - report corruption
                        )
                        .check.interaction({
                            state: 'state_report_legal',
                            reply: [
                                "Your details are confidential & used only by LHR & partners for investigation timeously, where possible. All rights reserved.",
                                "1. I understand",
                                "2. Exit"
                            ].join('\n')
                        })
                        .run();
                });

                it("should navigate to 5. state_report_legal", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '5'  // state_unregistered_menu - report xenophobia
                        )
                        .check.interaction({
                            state: 'state_report_legal',
                            reply: [
                                "LHR will process your info and try to respond timeously. Please don't abuse this system. All rights reserved.",
                                "1. I understand",
                                "2. Exit"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("upon country selection", function() {
                it("should navigate to state_ref_mig_1", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
                        )
                        .check.interaction({
                            state: 'state_ref_mig_1',
                            reply: [
                                "Would you like to find out if you qualify for refugee status?",
                                "1. Yes, I want to find out if I qualify",
                                "2. No, I'd like to access information for migrants"
                            ].join('\n')
                        })
                        .run();
                });

                it("should save their country choice", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language - french
                            , '1'  // state_consent - give consent
                            , '1'  // state_unregistered_menu - more info
                            , '5'  // state_country - burundi
                        )
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 5);
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.lang, 'fr');
                            assert.equal(contact.extra.consent, 'give_consent');
                            assert.equal(contact.extra.country, 'burundi');
                            assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                        })
                        .run();
                });
            });

            describe("upon state_ref_mig_1 answer", function() {
                describe("if the user selects 1. Yes", function() {
                    it("should navigate to state_ref_mig_2", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                            )
                            .check.interaction({
                                state: 'state_ref_mig_2',
                                reply: [
                                    "Have you fled from your country in fear of your life due to your race, religion, nationality, gender, political or social group?",
                                    "1. Yes",
                                    "2. No"
                                ].join('\n')
                            })
                            .run();
                    });
                });

                describe("if the user selects 2. No", function() {
                    it("should navigate to state_migrant_main", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '2'  // state_ref_mig_1 - no
                            )
                            .check.interaction({
                                state: 'state_migrant_main'
                            })
                            .run();
                    });

                    it("should register user as a migrant", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '2'  // state_ref_mig_1 - no
                            )
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 6);
                                assert.equal(contact.extra.language, 'french');
                                assert.equal(contact.extra.lang, 'fr');
                                assert.equal(contact.extra.consent, 'give_consent');
                                assert.equal(contact.extra.country, 'burundi');
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                                assert.equal(contact.extra.status, 'migrant');
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '2'  // state_ref_mig_1 - no
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
                });
            });

            describe("upon state_ref_mig_2 answer", function() {
                describe("if the user selects 2. No", function() {
                    it("should navigate to state_ref_mig_3", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                            )
                            .check.interaction({
                                state: 'state_ref_mig_3',
                                reply: [
                                    "Are you married to or depend upon a person who fled their country in fear of their life?",
                                    "1. Yes",
                                    "2. No"
                                ].join('\n')
                            })
                            .run();
                    });
                });

                describe("if the user selects 1. Yes", function() {
                    it("should navigate to state_ref_qualify", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '1'  // state_ref_mig_2 - yes
                            )
                            .check.interaction({
                                state: 'state_ref_qualify',
                                reply: [
                                    "It looks like you may qualify for refugee status! Your asylum application process will confirm this. Please start this application now.",
                                    "1. Find out more",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });

                    it("should register user as a refugee", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '1'  // state_ref_mig_2 - yes
                            )
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 6);
                                assert.equal(contact.extra.language, 'french');
                                assert.equal(contact.extra.lang, 'fr');
                                assert.equal(contact.extra.consent, 'give_consent');
                                assert.equal(contact.extra.country, 'burundi');
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                                assert.equal(contact.extra.status, 'refugee');
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '1'  // state_ref_mig_2 - yes
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
                });
            });

            describe("upon state_ref_mig_3 answer", function() {
                describe("if the user selects 2. No", function() {
                    it("should navigate to state_ref_mig_4", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                            )
                            .check.interaction({
                                state: 'state_ref_mig_4',
                                reply: [
                                    "Are you married to a recognised refugee?",
                                    "1. Yes",
                                    "2. No"
                                ].join('\n')
                            })
                            .run();
                    });
                });

                describe("if the user selects 1. Yes", function() {
                    it("should navigate to state_ref_qualify", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '1'  // state_ref_mig_3 - yes
                            )
                            .check.interaction({
                                state: 'state_ref_qualify',
                                reply: [
                                    "It looks like you may qualify for refugee status! Your asylum application process will confirm this. Please start this application now.",
                                    "1. Find out more",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });

                    it("should register user as a refugee", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '1'  // state_ref_mig_3 - yes
                            )
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 6);
                                assert.equal(contact.extra.language, 'french');
                                assert.equal(contact.extra.lang, 'fr');
                                assert.equal(contact.extra.consent, 'give_consent');
                                assert.equal(contact.extra.country, 'burundi');
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                                assert.equal(contact.extra.status, 'refugee');
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '1'  // state_ref_mig_3 - yes
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
                });
            });

            describe("upon state_ref_mig_4 answer", function() {
                describe("if the user selects 2. No", function() {
                    it("should navigate to state_ref_noqualify", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '2'  // state_ref_mig_4 - no
                            )
                            .check.interaction({
                                state: 'state_ref_noqualify',
                                reply: [
                                    "You don't qualify for refugee status in SA. If you are a foreign national looking to work, study or run a business you'll need a visa.",
                                    "1. Find out more",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });

                    it("should register user as a migrant", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '2'  // state_ref_mig_4 - no
                            )
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 6);
                                assert.equal(contact.extra.language, 'french');
                                assert.equal(contact.extra.lang, 'fr');
                                assert.equal(contact.extra.consent, 'give_consent');
                                assert.equal(contact.extra.country, 'burundi');
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                                assert.equal(contact.extra.status, 'migrant');
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '2'  // state_ref_mig_4 - no
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
                });

                describe("if the user selects 1. Yes", function() {
                    it("should navigate to state_ref_qualify", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '1'  // state_ref_mig_4 - yes
                            )
                            .check.interaction({
                                state: 'state_ref_qualify',
                                reply: [
                                    "It looks like you may qualify for refugee status! Your asylum application process will confirm this. Please start this application now.",
                                    "1. Find out more",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });

                    it("should register user as a refugee", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '1'  // state_ref_mig_4 - yes
                            )
                            .check(function(api) {
                                var contact = _.find(api.contacts.store, {
                                    msisdn: '+082111'
                                });
                                assert.equal(Object.keys(contact.extra).length, 6);
                                assert.equal(contact.extra.language, 'french');
                                assert.equal(contact.extra.lang, 'fr');
                                assert.equal(contact.extra.consent, 'give_consent');
                                assert.equal(contact.extra.country, 'burundi');
                                assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
                                assert.equal(contact.extra.status, 'refugee');
                            })
                            .run();
                    });

                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('082111')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '1'  // state_ref_mig_4 - yes
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
                });
            });

            describe("upon state_ref_noqualify selection", function() {
                it("should navigate to 1. state_migrant_main", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '2'  // state_ref_mig_4 - no
                                , '1'  // state_ref_noqualify - more info
                            )
                        .check.interaction({
                            state: 'state_migrant_main',
                        })
                        .run();
                });

                it("should navigate to 2. state_registration_end", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '2'  // state_ref_mig_4 - no
                                , '2'  // state_ref_noqualify - exit
                            )
                        .check.interaction({
                            state: 'state_registration_end',
                            reply: "Thank you for dialling into the refugee and migrants rights service. Please dial back in to find out more."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("upon state_ref_qualify selection", function() {
                it("should navigate to 1. state_refugee_main", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '1'  // state_ref_mig_4 - yes
                                , '1'  // state_ref_qualify - more info
                            )
                        .check.interaction({
                            state: 'state_refugee_main',
                        })
                        .run();
                });

                it("should navigate to 2. state_registration_end", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '1'  // state_ref_mig_4 - yes
                                , '2'  // state_ref_qualify - exit
                            )
                        .check.interaction({
                            state: 'state_registration_end',
                            reply: "Thank you for dialling into the refugee and migrants rights service. Please dial back in to find out more."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("dialing in after reaching state_registration_end", function() {
                it("should navigate to state_registered_landing", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_language - french
                                , '1'  // state_consent - give consent
                                , '1'  // state_unregistered_menu - more info
                                , '5'  // state_country - burundi
                                , '1'  // state_ref_mig_1 - yes
                                , '2'  // state_ref_mig_2 - no
                                , '2'  // state_ref_mig_3 - no
                                , '2'  // state_ref_mig_4 - no
                                , '2'  // state_ref_noqualify - exit
                                , {session_event: 'new'}  // redial
                            )
                        .check.interaction({
                            state: 'state_registered_landing',
                        })
                        .run();
                });
            });

        });

        // TEST REPORTING

        describe("Reporting testing", function() {

            describe("xenophobia reporting", function() {
                it("should navigate to state_report_legal", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_registered_landing - report xenophobia
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_report_legal'
                        })
                        .run();
                });

                describe("upon state_report_legal selection", function() {
                    describe("selecting I understand", function() {
                        it("should navigate to state_report_category", function() {
                            return tester
                                .setup.user.addr('064001')
                                .inputs(
                                    {session_event: 'new'}  // dial in
                                    , '2'  // state_registered_landing - report xenophobia
                                    , '1'  // state_report_legal - i understand
                                )
                                // check navigation
                                .check.interaction({
                                    state: 'state_report_category',
                                    reply: [
                                        "Which of these xenophobic acts is taking place?",
                                        "1. Physical threat",
                                        "2. Protests in your area",
                                        "3. Looting in your area"
                                    ].join('\n')
                                })
                                .run();
                        });
                    });

                    describe("selecting Exit", function() {
                        it("should navigate to state_report_end_permission", function() {
                            return tester
                                .setup.user.addr('064001')
                                .inputs(
                                    {session_event: 'new'}  // dial in
                                    , '2'  // state_registered_landing - report xenophobia
                                    , '2'  // state_report_legal - exit
                                )
                                // check navigation
                                .check.interaction({
                                    state: 'state_report_end_permission',
                                    reply: "Unfortunately you cannot submit a report without indicating you understand and agree to the terms & conditions. Please redial to try again."
                                })
                                .check.reply.ends_session()
                                .run();
                        });
                    });
                });

                describe("upon state_report_category selection", function() {
                    it("should navigate to state_report_location", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_location',
                                reply: "Please type the name of the suburb in which the incident took place.",
                            })
                            .run();
                    });
                });

                describe("upon state_report_location entry 1", function() {
                    // Note in-depth testing of location state is done elsewhere
                    it("if multiple results, should ask which suburb", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                                , 'Quad Street'  // state_report_location
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_location',
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
                });

                describe("upon state_report_location entry 2", function() {
                    it("navigate to state_report_details", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_details',
                                reply: "Please type an explanation of what's happening. Are you in danger? Is someone else? Be specific – it'll enable us to send the right response & help you faster.",
                            })
                            .run();
                    });

                    it("should save data to contact upon choice", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
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
                });

                describe("upon state_report_details entry", function() {
                    it("should navigate to state_report_complete", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                                , 'Send help plz'  // state_report_details
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_complete',
                                reply: [
                                    "Thank you very much. Your report has been submitted.",
                                    "1. Main menu",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });
                });

                describe("upon state_report_complete entry", function() {
                    it("should navigate to 1. state_registered_landing", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                                , 'Send help plz'  // state_report_details
                                , '1'  // state_report_complete - main menu
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_registered_landing',
                            })
                            .run();
                    });

                    it("should navigate to 2. state_report_end", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_registered_landing - report xenophobia
                                , '1'  // state_report_legal - i understand
                                , '3'  // state_report_category - looting
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                                , 'Send help plz'  // state_report_details
                                , '2'  // state_report_complete - exit
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_end',
                                reply: 'Goodbye!'
                            })
                            .check.reply.ends_session()
                            .run();
                    });
                });
            });

            describe("corruption reporting", function() {
                it("should navigate to state_report_legal", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '4'  // state_registered_landing - report corruption
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_report_legal'
                        })
                        .run();
                });

                describe("upon state_report_legal selection", function() {
                    describe("selecting I understand", function() {
                        it("should navigate to state_report_category", function() {
                            return tester
                                .setup.user.addr('064001')
                                .inputs(
                                    {session_event: 'new'}  // dial in
                                    , '4'  // state_registered_landing - report corruption
                                    , '1'  // state_report_legal - i understand
                                )
                                // check navigation
                                .check.interaction({
                                    state: 'state_report_category',
                                    reply: [
                                        "Where have you experienced corruption?",
                                        "1. Refugee Reception Office",
                                        "2. South African Police Service",
                                        "3. Department of Home Affairs",
                                        "4. Social services",
                                        "5. Other"
                                    ].join('\n')
                                })
                                .run();
                        });
                    });

                    describe("selecting Exit", function() {
                        it("should navigate to state_report_end_permission", function() {
                            return tester
                                .setup.user.addr('064001')
                                .inputs(
                                    {session_event: 'new'}  // dial in
                                    , '4'  // state_registered_landing - report corruption
                                    , '2'  // state_report_legal - exit
                                )
                                // check navigation
                                .check.interaction({
                                    state: 'state_report_end_permission',
                                    reply: "Unfortunately you cannot submit a report without indicating you understand and agree to the terms & conditions. Please redial to try again."
                                })
                                .check.reply.ends_session()
                                .run();
                        });
                    });
                });

                describe("upon state_report_category selection", function() {
                    it("should navigate to state_report_location", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_location',
                                reply: "Please type the name of the suburb in which the incident took place.",
                            })
                            .run();
                    });
                });

                describe("upon state_report_location entry 1", function() {
                    // Note in-depth testing of location state is done elsewhere
                    it("if multiple results, should ask which suburb", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                                , 'Quad Street'  // state_report_location
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_location',
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
                });

                describe("upon state_report_location entry 2", function() {
                    it("navigate to state_report_details", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_details',
                                reply: "Please type a detailed explanation of the incident: what happened; where it happened; the offending official's name; his/her physical features; date/time",
                            })
                            .run();
                    });

                    it("should save data to contact upon choice", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
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
                });

                describe("upon state_report_details entry", function() {
                    it("should navigate to state_report_complete", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                                , 'Send help plz'  // state_report_details
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_complete',
                                reply: [
                                    "Thank you very much. Your report has been submitted.",
                                    "1. Main menu",
                                    "2. Exit"
                                ].join('\n')
                            })
                            .run();
                    });
                });

                describe("upon state_report_complete entry", function() {
                    it("should navigate to 1. state_registered_landing", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                                , 'Send help plz'  // state_report_details
                                , '1'  // state_report_complete - main menu
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_registered_landing',
                            })
                            .run();
                    });

                    it("should navigate to 2. state_report_end", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_registered_landing - report corruption
                                , '1'  // state_report_legal - i understand
                                , '5'  // state_report_category - other
                                , 'Quad Street'  // state_report_location
                                , '3'  // state_report_location
                                , 'Send help plz'  // state_report_details
                                , '2'  // state_report_complete - exit
                            )
                            // check navigation
                            .check.interaction({
                                state: 'state_report_end',
                                reply: 'Goodbye!'
                            })
                            .check.reply.ends_session()
                            .run();
                    });
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                        )
                        .check.interaction({
                            state: 'state_services',
                            reply:
                                "To find services near you we need to know what suburb or area you are in. Please type this in below & be specific. e.g. Inanda Sandton",
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Quad Street'  // state_services
                        )
                        .check.interaction({
                            state: 'state_services',
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Quad Street'  // state_services
                            , 'n'  // state_services
                        )
                        .check.interaction({
                            state: 'state_services',
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Quad Street'  // state_services
                            , '3'  // state_services
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Quad Street'  // state_services
                            , 'n'  // state_services
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

                it("should stall them after they choose their location", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Quad Street'  // state_services
                            , '3'  // state_services
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

                it("should fire metrics after their location is submitted", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Quad Street'  // state_services
                            , '3'  // state_services
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.location_queries.last'].values, [1]);
                            assert.deepEqual(metrics['total.location_queries.sum'].values, [1]);
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                        )
                        .check.interaction({
                            state: 'state_locate_show_results',
                            reply: [
                                "Select a service for more info",
                                "1. Mowbray Police",
                                "2. Turkmenistan Police"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user selects to see more info about a location", function() {
                it("should show them more info (with details)", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                            , '1'  // state_locate_show_results
                        )
                        .check.interaction({
                            state: 'state_locate_details',
                            reply: [
                                "Mowbray Police (012 001 0002)",
                                "1. Exit"
                            ].join('\n')
                        })
                        .run();
                });

                it("should show them more info (without details)", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                            , '2'  // state_locate_show_results
                        )
                        .check.interaction({
                            state: 'state_locate_details',
                            reply: [
                                "Turkmenistan Police",
                                "1. Exit"
                            ].join('\n')
                        })
                        .run();
                });

                it("should show them their locations again when they exit", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                            , '1'  // state_locate_show_results
                            , '1'  // state_locate_details
                        )
                        .check.interaction({
                            state: 'state_locate_show_results',
                            reply: [
                                "Select a service for more info",
                                "1. Mowbray Police",
                                "2. Turkmenistan Police"
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
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                        )
                        .check.interaction({
                            state: 'state_locate_no_results',
                            reply: [
                                "Unfortunately we couldn't find any locations close to you. Try one more time or exit?",
                                "1. Try again",
                                "2. Exit"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user decides to exit rather than retry", function() {
                it("should go to exit state", function() {
                    return tester
                        .setup.user.addr('064003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                            , '2'  // state_locate_no_results
                        )
                        .check.interaction({
                            state: 'state_locate_exit',
                            reply: "Sorry, no nearby services available. You can still use the Useful Contacts Main Menu option to search for services that are further off."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("when the user tries again after first failure and still no results", function() {
                it("should go to exit state", function() {
                    return tester
                        .setup.user.addr('064003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_refugee_main - find service
                            , 'Friend Street'  // state_services
                            , '1'  // state_locate_stall_initial
                            , '1'  // state_locate_no_results
                        )
                        .check.interaction({
                            state: 'state_locate_exit',
                            reply: "Sorry, no nearby services available. You can still use the Useful Contacts Main Menu option to search for services that are further off."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        // REFUGEE MAIN MENU TESTING

        describe("Refugee menu navigation testing", function() {

            describe("Refugee choosing to see menu", function() {
                it("should show main menu", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                        )
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                "Select an option:",
                                "1. Report",
                                "2. Step 1: Applying for asylum",
                                "3. Step 2: Life in SA",
                                "4. Tips",
                                "5. About/T&Cs",
                                "6. Services Near Me",
                                "7. Change Settings"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("When navigating away from the refugee main menu", function() {
                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '1'  // state_refugee_main
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.refugee_main.state_registered_landing.last'].values, [1]);
                            assert.deepEqual(metrics['total.refugee_main.state_registered_landing.sum'].values, [1]);
                        })
                        .run();
                });
            });

            describe("Navigation from the Refugee Main Menu", function() {
                it("1. Report", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '1'  // state_refugee_main
                        )
                        .check.interaction({
                            state: 'state_registered_landing'
                        })
                        .run();
                });

                it("2. Step 1", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '2'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("3. Step 2", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '3'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("4. Tips", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '4'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("5. About TCs", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '5'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("6. Services Near Me", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '6'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_services"
                        })
                        .run();
                });

                it("7. Change settings", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '7'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_change_settings"
                        })
                        .run();
                });
            });

        });

        // MIGRANT MAIN MENU TESTING

        describe("Migrant menu navigation testing", function() {

            describe("Migrant choosing to see menu", function() {
                it("should show main menu", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                        )
                        .check.interaction({
                            state: 'state_migrant_main',
                            reply: [
                                "Select an option:",
                                "1. Report",
                                "2. Step 1: Visa application",
                                "3. Step 2: Life in SA",
                                "4. About/T&Cs",
                                "5. Services Near Me",
                                "6. Change Settings"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("When navigating away from the migrant main menu", function() {
                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '1'  // state_migrant_main
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.migrant_main.state_registered_landing.last'].values, [1]);
                            assert.deepEqual(metrics['total.migrant_main.state_registered_landing.sum'].values, [1]);
                        })
                        .run();
                });
            });

            describe("Navigation from the migrant Main Menu", function() {
                it("1. Report", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '1'  // state_migrant_main
                        )
                        .check.interaction({
                            state: 'state_registered_landing'
                        })
                        .run();
                });

                it("2. Step 1", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '2'  // state_migrant_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("3. Step 2", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '3'  // state_migrant_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("4. About TCs", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '4'  // state_migrant_main
                        )
                        .check.interaction({
                            state: "state_faq_topics"
                        })
                        .run();
                });

                it("5. Services Near Me", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '5'  // state_migrant_main
                        )
                        .check.interaction({
                            state: "state_services"
                        })
                        .run();
                });

                it("6. Change settings", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '6'  // state_migrant_main
                        )
                        .check.interaction({
                            state: "state_change_settings"
                        })
                        .run();
                });
            });

        });

        // SNAPPY FAQ BROWSER TESTING

        describe("Snappy FAQ Browser testing", function() {

            describe("When the user chooses an FAQ", function() {
                it("should show the topics", function() {
                    return tester
                        .setup.user.addr('064001')
                        .inputs(
                            {session_event: 'new'}  // dial in first time
                            , '1'  // state_registered_landing
                            , '2'  // state_refugee_main
                        )
                        .check.interaction({
                            state: "state_faq_topics",
                            reply: [
                                "Select an option:",
                                "1. When/where to appfr",
                                "2. The Procefr",
                                "3. Appl. Resulfr",
                                "4. Your Righfr",
                                "5. Arrefr",
                                "6. Childrfr",
                                "7. Helplinfr",
                                "8. Back"
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("When the user chooses a topic", function() {
                describe("if they choose Back", function() {
                    it("should show the main menu", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '1'  // state_registered_landing
                                , '2'  // state_refugee_main
                                , '8'  // state_faq_topics
                            )
                            .check.interaction({
                                state: "state_refugee_main"
                            })
                            .run();
                    });
                });

                describe("if they choose an actual topic", function() {
                    it("should show the questions for that topic", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '1'  // state_registered_landing
                                , '2'  // state_refugee_main
                                , '1'  // state_faq_topics - when/where to apply
                            )
                            .check.interaction({
                                state: "state_faq_questions",
                                reply: [
                                    "Select an option:",
                                    "1. Apply at Rfr",
                                    "2. Durbfr",
                                    "3. Musifr",
                                    "4. Back"
                                ].join('\n')
                            })
                            .run();
                    });
                });
            });

            describe("When the user chooses a question", function() {
                describe("if they choose Back", function() {
                    it("should show the topics page", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '1'  // state_registered_landing
                                , '2'  // state_refugee_main
                                , '1'  // state_faq_topics - when/where to apply
                                , '4'  // state_faq_questions - back
                            )
                            .check.interaction({
                                state: "state_faq_topics"
                            })
                            .run();
                    });
                });

                describe("if they choose an actual question", function() {
                    it("should show the answer for that question", function() {
                        return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '1'  // state_registered_landing
                                , '2'  // state_refugee_main
                                , '1'  // state_faq_topics - when/where to apply
                                , '3'  // state_faq_questions - musina
                            )
                            .check.interaction({
                                state: "state_faq_answer",
                                reply: [
                                    "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel:",
                                    "1. Next",
                                    "2. Send to me by SMS"
                                ].join('\n')
                            })
                            .run();
                    });
                });
            });

            describe("When a user chooses to get answer by SMS", function() {
                it("should send them the answer via sms", function() {
                    return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '1'  // state_registered_landing
                                , '2'  // state_refugee_main
                                , '1'  // state_faq_topics - when/where to apply
                                , '3'  // state_faq_questions - musina
                                , '2'  // state_faq_answer - send via sms
                            )
                            .check(function(api) {
                                var smses = _.where(api.outbound.store, {
                                    endpoint: 'sms'
                                });
                                var sms = smses[0];
                                assert.equal(smses.length, 1);
                                assert.equal(sms.content, "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.");
                            })
                            .run();
                });

                it("show them an exit message and exit", function() {
                    return tester
                            .setup.user.addr('064001')
                            .inputs(
                                {session_event: 'new'}  // dial in first time
                                , '1'  // state_registered_landing
                                , '2'  // state_refugee_main
                                , '1'  // state_faq_topics - when/where to apply
                                , '3'  // state_faq_questions - musina
                                , '2'  // state_faq_answer - send via sms
                            )
                            .check.interaction({
                                state: "state_faq_end",
                                reply: "Your SMS will be sent to you shortly. Don't forget to dial back in to *120*8864*0000# to find all the info you need about applying for asylum and living in SA."
                            })
                            .check.reply.ends_session()
                            .run();
                });

            });

        });

        // TEST RETURNING USER METRICS

        // describe("Returning user metrics & extras testing", function() {
        //     describe("when a new user logs on", function() {
        //         it("should update extra.last_seen", function() {
        //             return tester
        //                 .setup(function(api) {
        //                     api.contacts.add({
        //                         msisdn: '+082111',
        //                         extra : {},
        //                         key: "contact_key",
        //                         user_account: "contact_user_account"
        //                     });
        //                 })
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                 )
        //                 // check metrics
        //                 .check(function(api) {
        //                     var metrics = api.metrics.stores.refugeerights_test;
        //                     assert.deepEqual(metrics['total.returning_users.last'], undefined);
        //                 })
        //                 // check extras
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+082111'
        //                     });
        //                     assert.equal(Object.keys(contact.extra).length, 1);
        //                     assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("when an unregistered user returns", function() {
        //         it("should update extra.last_seen", function() {
        //             return tester
        //                 .setup(function(api) {
        //                     api.contacts.add({
        //                         msisdn: '+082111',
        //                         extra : {
        //                             last_seen: '2015-03-03'  // 31d ago
        //                         },
        //                         key: "contact_key",
        //                         user_account: "contact_user_account"
        //                     });
        //                 })
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , {session_event: 'close'}
        //                     , {session_event: 'new'}
        //                 )
        //                 // check metrics
        //                 .check(function(api) {
        //                     var metrics = api.metrics.stores.refugeerights_test;
        //                     assert.deepEqual(metrics['total.returning_users.last'], undefined);
        //                 })
        //                 // check extras
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+082111'
        //                     });
        //                     assert.equal(Object.keys(contact.extra).length, 4);
        //                     assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
        //                     assert.equal(contact.extra.lang, 'fr');
        //                     assert.equal(contact.extra.language, 'french');
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("when a user returns the first time after registering", function() {
        //         it("should fire returning user metric", function() {
        //             return tester
        //                 .setup(function(api) {
        //                     api.contacts.add({
        //                         msisdn: '+082111',
        //                         extra : {},
        //                         key: "contact_key",
        //                         user_account: "contact_user_account"
        //                     });
        //                 })
        //                 .setup.user.addr('082111')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                     , '2'  // state_language - french
        //                     , '5'  // state_country - burundi
        //                     , '3'  // state_status (refugee)
        //                     , '3'  // state_refugee_rights_info (exit)
        //                     , {session_event: 'close'}
        //                     , {session_event: 'new'}  // redial
        //                 )
        //                 // check metrics
        //                 .check(function(api) {
        //                     var metrics = api.metrics.stores.refugeerights_test;
        //                     assert.equal(Object.keys(metrics).length, 18);
        //                     assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
        //                     assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
        //                 })
        //                 // check extras
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+082111'
        //                     });
        //                     assert.equal(Object.keys(contact.extra).length, 7);
        //                     assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
        //                     assert.equal(contact.extra.last_returning_metric_fire, '2015-04-03 06:07:08.999');
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("when a registered user returns after less than a week", function() {
        //         it("should not fire returning user metrics", function() {
        //             return tester
        //                 .setup.user.addr('064002')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                 )
        //                 // check metrics
        //                 .check(function(api) {
        //                     var metrics = api.metrics.stores.refugeerights_test;
        //                     assert.equal(Object.keys(metrics).length, 4);
        //                     assert.deepEqual(metrics['total.returning_users.last'], undefined);
        //                 })
        //                 // check extras
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+064002'
        //                     });
        //                     assert.equal(Object.keys(contact.extra).length, 6);
        //                     assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
        //                     assert.equal(contact.extra.last_returning_metric_fire, '2015-03-31 12:00:00.000');
        //                 })
        //                 .run();
        //         });
        //     });

        //     describe("when a registered user returns after more than a week", function() {
        //         it("should fire returning user metrics", function() {
        //             return tester
        //                 .setup.user.addr('064001')
        //                 .inputs(
        //                     {session_event: 'new'}  // dial in
        //                 )
        //                 // check metrics
        //                 .check(function(api) {
        //                     var metrics = api.metrics.stores.refugeerights_test;
        //                     assert.equal(Object.keys(metrics).length, 6);
        //                     assert.deepEqual(metrics['total.returning_users.last'].values, [1]);
        //                     assert.deepEqual(metrics['total.returning_users.sum'].values, [1]);
        //                 })
        //                 // check extras
        //                 .check(function(api) {
        //                     var contact = _.find(api.contacts.store, {
        //                         msisdn: '+064001'
        //                     });
        //                     assert.equal(Object.keys(contact.extra).length, 6);
        //                     assert.equal(contact.extra.last_seen, '2015-04-03 06:07:08.999');
        //                     assert.equal(contact.extra.last_returning_metric_fire, '2015-04-03 06:07:08.999');
        //                 })
        //                 .run();
        //         });
        //     });
        // });

        // TEST USER SETTINGS CHANGING

        describe("User settings changes testing", function() {
            describe("when the user changes their language", function() {
                it("should navigate back to settings change menu", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '1'  // state_change_settings - change language
                            , '1'  // state_change_language - english
                        )
                        .check.interaction({
                            state: 'state_change_settings'
                        })
                        .run();
                });

                it("should change their language", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '1'  // state_change_settings - change language
                            , '1'  // state_change_language - english
                        )
                        // check user extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+064002'
                            });
                            assert.equal(contact.extra.language, 'english');
                            assert.equal(contact.extra.lang, 'en');
                        })
                        // check user language is set
                        .check.user.properties({lang: 'en'})
                        .run();
                });

                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '1'  // state_change_settings - change language
                            , '1'  // state_change_language - english
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.change_language.last'].values, [1]);
                            assert.deepEqual(metrics['total.change_language.sum'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the user changes their country", function() {
                it("should navigate back to settings change menu", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '2'  // state_change_settings - change country
                            , '3'  // state_change_country - eritrea
                        )
                        .check.interaction({
                            state: 'state_change_settings'
                        })
                        .run();
                });

                it("should change their country", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '2'  // state_change_settings - change country
                            , '3'  // state_change_country - eritrea
                        )
                        // check user extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+064002'
                            });
                            assert.equal(contact.extra.country, 'eritrea');
                        })
                        .run();
                });

                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '2'  // state_change_settings - change country
                            , '3'  // state_change_country - eritrea
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.change_country.last'].values, [1]);
                            assert.deepEqual(metrics['total.change_country.sum'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the user changes their status", function() {
                it("should navigate back to status change confirmation menu", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '3'  // state_change_settings - change status
                            , '1'  // state_change_status - refugee
                        )
                        .check.interaction({
                            state: 'state_change_status_confirm',
                            reply: [
                                "When you registered, you were identified as a migrant. Are you sure you would like to change your status?",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .run();
                });

                it("should change their status if they select yes", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '3'  // state_change_settings - change status
                            , '1'  // state_change_status - refugee
                            , '1'  // state_change_status_confirm - yes
                        )
                        // check user extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+064002'
                            });
                            assert.equal(contact.extra.status, 'refugee');
                        })
                        .run();
                });

                it("should not change their status if they select no", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '3'  // state_change_settings - change status
                            , '1'  // state_change_status - refugee
                            , '2'  // state_change_status_confirm - no
                        )
                        // check user extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+064002'
                            });
                            assert.equal(contact.extra.status, 'migrant');
                        })
                        .check.interaction({
                            state: 'state_change_settings'
                        })
                        .run();
                });

                it("should fire metrics", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '3'  // state_change_settings - change status
                            , '1'  // state_change_status - refugee
                            , '1'  // state_change_status_confirm - yes
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.deepEqual(metrics['total.change_status.last'].values, [1]);
                            assert.deepEqual(metrics['total.change_status.sum'].values, [1]);
                        })
                        .run();
                });

                it("should show the settings updates screen when they exit the menu", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '3'  // state_change_settings - change status
                            , '1'  // state_change_status - refugee
                            , '1'  // state_change_status_confirm - yes
                            , '4'  // state_change_settings - back to main menu
                        )
                        .check.interaction({
                            state: 'state_change_confirmation'
                        })
                        .run();
                });

                it("should show the main menu corresponding with the new status", function() {
                    return tester
                        .setup.user.addr('064002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_registered_landing - menu
                            , '6'  // state_migrant_main - change settings
                            , '3'  // state_change_settings - change status
                            , '1'  // state_change_status - refugee
                            , '1'  // state_change_status_confirm - yes
                            , '4'  // state_change_settings - back to main menu
                            , '1'  // state_change_confirmation - continue
                        )
                        .check.interaction({
                            state: 'state_refugee_main'
                        })
                        .run();
                });
            });
        });


    });
});
