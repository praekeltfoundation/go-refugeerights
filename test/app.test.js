var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var assert = require('assert');
var _ = require('lodash');
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
                })
                .setup(function(api) {
                    // new user 1
                    api.contacts.add({
                        msisdn: '+082111',
                        extra: {},
                        key: "contact_key",
                        user_account: "contact_user_account"
                    });
                });
        });

    // TEST PAGINATEDCHOICESTATE PAGING

        describe("PaginatedChoiceState testing using Refugee Main Menu", function() {
            describe("forward navigation", function() {
                it("should display page 1 on arrival", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // check navigation
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

                it("should display page 2 on Next", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '7'  // state_refugee_main (Next)
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Health rights',
                                '2. Education',
                                '3. Social services',
                                '4. Banking',
                                '5. Tips page',
                                '6. Helpful contact numbers',
                                '7. Safety concerns',
                                '8. Next',
                                '9. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 3 on Next", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '7'  // state_refugee_main (Next p1)
                            , '8'  // state_refugee_main (Next p2)
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Statelessness',
                                '2. LGBTI rights',
                                '3. Violence against women',
                                '4. Word definitions',
                                '5. More word definitions',
                                '6. Change settings',
                                '7. Next',
                                '8. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 4 on Next", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '7'  // state_refugee_main (Next p1)
                            , '8'  // state_refugee_main (Next p2)
                            , '7'  // state_refugee_main (Next p3)
                        )
                        // check navigation
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
                            {session_event: 'new'}  // dial in
                            , '7'  // state_refugee_main (Next p1)
                            , '8'  // state_refugee_main (Next p2)
                            , '7'  // state_refugee_main (Next p3)
                            , '3'  // state_refugee_main (Back p4)
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Statelessness',
                                '2. LGBTI rights',
                                '3. Violence against women',
                                '4. Word definitions',
                                '5. More word definitions',
                                '6. Change settings',
                                '7. Next',
                                '8. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 2 on Back", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '7'  // state_refugee_main (Next p1)
                            , '8'  // state_refugee_main (Next p2)
                            , '7'  // state_refugee_main (Next p3)
                            , '3'  // state_refugee_main (Back p4)
                            , '8'  // state_refugee_main (Back p3)
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_refugee_main',
                            reply: [
                                'MAIN MENU',
                                '1. Health rights',
                                '2. Education',
                                '3. Social services',
                                '4. Banking',
                                '5. Tips page',
                                '6. Helpful contact numbers',
                                '7. Safety concerns',
                                '8. Next',
                                '9. Back'
                            ].join('\n')
                        })
                        .run();
                });

                it("should display page 1 on Back", function() {
                    return tester
                        .setup.user.addr('082111')
                        .setup.user.state('state_refugee_main')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '7'  // state_refugee_main (Next p1)
                            , '8'  // state_refugee_main (Next p2)
                            , '7'  // state_refugee_main (Next p3)
                            , '3'  // state_refugee_main (Back p4)
                            , '8'  // state_refugee_main (Back p3)
                            , '9'  // state_refugee_main (Back p3)
                        )
                        // check navigation
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


    // TEST REGISTRATION

        describe("starting session", function() {
            it("should ask for their language", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_language',
                        reply: [
                            "Welcome! Find info about migrants, asylum, refugees & support services. Pls choose ur language:",
                            "1. English",
                            "2. French",
                            "3. Amharic",
                            "4. Swahili",
                            "5. Somail"
                        ].join('\n')
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.refugeerights_test;
                        assert.equal(Object.keys(metrics).length, 2);
                        assert.deepEqual(metrics['total.unique_users'].values, [1]);
                        assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
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
                    // check navigation
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
                            '8. Next'
                        ].join('\n')
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.refugeerights_test;
                        assert.equal(Object.keys(metrics).length, 2);
                        assert.deepEqual(metrics['total.unique_users'].values, [1]);
                        assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
                    })
                    // check user extras
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                            msisdn: '+082111'
                        });
                        assert.equal(contact.extra.language, 'french');
                    })
                    // check user language is set
                    .check.user.properties({lang: 'french'})
                    .run();
            });

            it("should display page 2 of countries if Next is selected", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language
                        , '8'  // state_country
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_country',
                        reply: [
                            'Select your country of origin:',
                            '1. Sudan/South Sudan',
                            '2. Zimbabwe',
                            '3. Uganda',
                            '4. Egypt',
                            '5. Mozambique',
                            '6. Syria',
                            '7. Angola',
                            '8. Back'
                        ].join('\n')
                    })
                    .run();
            });

            it("should display page 1 if Next then Back is selected", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language
                        , '8'  // state_country
                        , '8'  // state_country
                    )
                    // check navigation
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
                            '8. Next'
                        ].join('\n')
                    })
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
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_status',
                        reply: [
                            'Are you a refugee or migrant?',
                            '1. Who is a refugee?',
                            '2. Who is a migrant?',
                            '3. I am neither'
                        ].join('\n')
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.refugeerights_test;
                        assert.equal(Object.keys(metrics).length, 2);
                        assert.deepEqual(metrics['total.unique_users'].values, [1]);
                        assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
                    })
                    // check user extras
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                            msisdn: '+082111'
                        });
                        assert.equal(Object.keys(contact.extra).length, 2);
                        assert.equal(contact.extra.language, 'french');
                        assert.equal(contact.extra.country, 'syria');
                    })
                    .run();
            });
        });

        describe("upon status selection", function() {
            describe("if the user selected refugee info", function() {
                it("should show refugee info", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '8'  // state_country (next page)
                            , '6'  // state_country (syria)
                            , '1'  // state_status (who is refugee)
                        )
                        // check navigation
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
                            , '8'  // state_country (next page)
                            , '6'  // state_country (syria)
                            , '2'  // state_status (who is migrant)
                        )
                        // check navigation
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

            describe("if the user indicates they are neither refugee nor migrant", function() {
                it("should do something", function() {
                    return tester
                        .setup.user.addr('082111')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_language (french)
                            , '8'  // state_country (next page)
                            , '6'  // state_country (syria)
                            , '3'  // state_status (neither)
                        )
                        // check navigation
                        .check.interaction({
                            state: 'state_neither',
                            reply: [
                                'Unknown 01',
                            ].join('\n')
                        })
                        // check metrics
                        .check(function(api) {
                            var metrics = api.metrics.stores.refugeerights_test;
                            assert.equal(Object.keys(metrics).length, 2);
                            assert.deepEqual(metrics['total.unique_users'].values, [1]);
                            assert.deepEqual(metrics['total.unique_users.transient'].values, [1]);
                        })
                        // check user extras
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                                msisdn: '+082111'
                            });
                            assert.equal(Object.keys(contact.extra).length, 3);
                            assert.equal(contact.extra.language, 'french');
                            assert.equal(contact.extra.country, 'syria');
                            assert.equal(contact.extra.status, 'neither');
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
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '1'  // state_status (who is refugee)
                        , '1'  // state_who_refugee (yes - refugee)
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_refugee_rights_info',
                        reply: [
                            'Welcome to Refugee Rights. Here is some information and tips on how to user this service. Info info info info info info info  info info',
                            '1. More',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });

            it("should display page 2 of info if More is selected", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language (french)
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '1'  // state_status (who is refugee)
                        , '1'  // state_who_refugee (yes - refugee)
                        , '1'  // state_refugee_rights_info
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_refugee_rights_info',
                        reply: [
                            'info info info info info info info info info info info info info info info info info info',
                            '1. Back',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });

            it("should take them to refugee main menu if they choose exit", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language (french)
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '1'  // state_status (who is refugee)
                        , '1'  // state_who_refugee (yes - refugee)
                        , '2'  // state_refugee_rights_info (exit)
                    )
                    // check navigation
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
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '2'  // state_status (who is migrant)
                        , '1'  // state_who_migrant (yes - migrant)
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_migrant_rights_info',
                        reply: [
                            'Welcome to Migrant Rights. Here is some information and tips on how to user this service. Info info info info info info info  info info',
                            '1. More',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });

            it("should display page 2 of info if More is selected", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language (french)
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '2'  // state_status (who is migrant)
                        , '1'  // state_who_migrant (yes - migrant)
                        , '1'  // state_migrant_rights_info
                    )
                    // check navigation
                    .check.interaction({
                        state: 'state_migrant_rights_info',
                        reply: [
                            'info info info info info info info info info info info info info info info info info info',
                            '1. Back',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });

            it("should take them to migrant main menu if they choose exit", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language (french)
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '2'  // state_status (who is migrant)
                        , '1'  // state_who_migrant (yes - migrant)
                        , '2'  // state_migrant_rights_info (exit)
                    )
                    // check navigation
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

            it("should take them to migrant main menu if they choose exit", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_language (french)
                        , '8'  // state_country (next page)
                        , '6'  // state_country (syria)
                        , '2'  // state_status (who is migrant)
                        , '1'  // state_who_migrant (yes - migrant)
                        , '2'  // state_migrant_rights_info (exit)
                    )
                    // check navigation
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
});