var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');
// var optoutstore = require('./optoutstore');
// var DummyOptoutResource = optoutstore.DummyOptoutResource;
var _ = require('lodash');

describe("refugeerights app", function() {
    describe("for sms use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoRRSms();

            tester = new AppTester(app);

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'smsapp',
                    env: 'test',
                    testing_today: '2015-04-03 06:07:08.999',
                    metric_store: 'refugeerights_test',
                    channel: "longcode555",
                    control: {
                        username: 'test_user',
                        api_key: 'test_key',
                        url: 'http://fixture/subscription/api/v1/'
                    },
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    }
                })
                // .setup(function(api) {
                //     api.resources.add(new DummyOptoutResource());
                //     api.resources.attach(api);
                // })
                .setup(function(api) {
                    api.metrics.stores = {'refugeerights_test': {}};
                })
                .setup(function(api) {
                    fixtures().forEach(function(d) {
                        d.repeatable = true;
                        api.http.fixtures.add(d);
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
                            registered: 'true'
                        },
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                })
                .setup(function(api) {
                    // registered refugee 1
                    api.contacts.add({
                        msisdn: '+064003',
                        extra: {
                            language: 'french',
                            lang: 'fr',
                            country: 'drc',
                            status: 'refugee',
                            registered: 'true',
                            optout_last_attempt: '2015-01-01 01:01:01.111'
                        },
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                });
        });


        describe("when the user sends a STOP message", function() {
            it("should opt them out", function() {
                // note optout functionality is also being tested via fixtures
                return tester
                    .setup.user.addr('064001')
                    .inputs('"stop" in the name of love')
                    // check navigation
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. Reply START to opt back in.'
                    })
                    // check extras
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                                msisdn: '+064001'
                            });
                        assert.equal(contact.extra.optout_last_attempt, '2015-04-03 06:07:08.999');
                        assert.equal(contact.extra.optin_last_attempt, undefined);
                    })
                    .run();
            });
        });

        describe("when the user sends a BLOCK message", function() {
            it("should opt them out", function() {
                // note optout functionality is also being tested via fixtures
                return tester
                    .setup.user.addr('064001')
                    .inputs('BLOCK')
                    // check navigation
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. Reply START to opt back in.'
                    })
                    // check extras
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                                msisdn: '+064001'
                            });
                        assert.equal(contact.extra.optout_last_attempt, '2015-04-03 06:07:08.999');
                        assert.equal(contact.extra.optin_last_attempt, undefined);
                    })
                    .run();
            });
        });

        describe("when the user sends a START message", function() {
            it("should opt them in", function() {
                // note optin functionality is also being tested via fixtures
                return tester
                    .setup.user.addr('064003')
                    .inputs('start')
                    // check navigation
                    .check.interaction({
                        state: 'state_opt_in',
                        reply:
                            'Thank you. You will now receive messages from us again. Reply STOP to unsubscribe.'
                    })
                    // check extras
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                                msisdn: '+064003'
                            });
                        assert.equal(contact.extra.optout_last_attempt, '2015-01-01 01:01:01.111');
                        assert.equal(contact.extra.optin_last_attempt, '2015-04-03 06:07:08.999');
                    })
                    .run();
            });
        });

        describe("when the user sends a different message", function() {
            it("should opt them in", function() {
                return tester
                    .setup.user.addr('064001')
                    .inputs('lhr')
                    // check navigation
                    .check.interaction({
                        state: 'state_unrecognised',
                        reply:
                            'We do not recognise the message you sent us. Reply STOP to unsubscribe.'
                    })
                    // check extras
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                                msisdn: '+064001'
                            });
                        assert.equal(contact.extra.optout_last_attempt, undefined);
                        assert.equal(contact.extra.optin_last_attempt, undefined);
                    })
                    .run();
            });
        });

    });
});
