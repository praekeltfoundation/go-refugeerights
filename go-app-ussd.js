// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

var Q = require('q');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var HttpApi = vumigo.http.api.HttpApi;

// Shared utils lib
go.utils = {

    timed_out: function(im) {
        var no_redirects = ['state_language', 'state_migrant_main', 'state_refugee_main'];
        return im.msg.session_event === 'new'
            && im.user.state.name
            && no_redirects.indexOf(im.user.state.name) === -1;
    },

    save_language: function(im, contact, lang) {
        var lang_map = {
            en: 'english',
            fr: 'french',
            am: 'amharic',
            sw: 'swahili',
            so: 'somali'
        };
        contact.extra.lang = lang;
        contact.extra.language = lang_map[lang];

        return Q.all([
            im.user.set_lang(lang),
            im.contacts.save(contact)
        ]);
    },

    set_language: function(im, contact) {
        if (contact.extra.lang !== undefined) {
            return im.user.set_lang(contact.extra.lang);
        } else {
            return Q();
        }
    },

    register_user: function(contact, im, status) {
        contact.extra.status = status;
        var country = contact.extra.country;

        return Q.all([
            im.contacts.save(contact),
            go.utils.subscription_subscribe(contact, im),
            im.metrics.fire.inc(['total', 'registrations', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'registrations', status, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', status, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'registrations', country, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', country, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'registrations', status, country, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', status, country, 'sum'].join('.'), 1)
        ]);
    },

    track_redials: function(contact, im, decision) {
        var status = contact.extra.status || 'unregistered';
        return Q.all([
            im.metrics.fire.inc(['total', 'redials', 'choice_made', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', 'choice_made', 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'redials', status, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', status, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'redials', decision, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', decision, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'redials', status, decision, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', status, decision, 'sum'].join('.'), 1),
        ]);
    },

    get_clean_first_word: function(user_message) {
        return user_message
            .split(" ")[0]          // split off first word
            .replace(/\W/g, '')     // remove non letters
            .toUpperCase();         // capitalise
    },

    control_api_call: function (method, params, payload, endpoint, im) {
        var http = new HttpApi(im, {
            headers: {
                'Content-Type': ['application/json'],
                'Authorization': ['ApiKey ' + im.config.control.username + ':' + im.config.control.api_key]
            }
        });
        switch (method) {
            case "post":
                return http.post(im.config.control.url + endpoint, {
                    data: JSON.stringify(payload)
                });
            case "get":
                return http.get(im.config.control.url + endpoint, {
                    params: params
                });
            case "patch":
                return http.patch(im.config.control.url + endpoint, {
                    data: JSON.stringify(payload)
                });
            case "put":
                return http.put(im.config.control.url + endpoint, {
                    params: params,
                  data: JSON.stringify(payload)
                });
            case "delete":
                return http.delete(im.config.control.url + endpoint);
            }
    },

    subscription_subscribe: function(contact, im) {
        // TODO update payload to new message subscription protocol
        var payload = {
            contact_key: contact.key,
            lang: contact.extra.lang,
            message_set: "/api/v1/message_set/" + '1' + "/",
            next_sequence_number: 1,
            schedule: "/api/v1/periodic_task/" + '1' + "/",
            to_addr: contact.msisdn,
            user_account: contact.user_account
        };

        return go.utils
            .control_api_call("post", null, payload, 'subscription/', im)
            .then(function(result) {
                if (result.code >= 200 && result.code < 300){
                    return Q.all([
                        im.metrics.fire.inc(["total", "subscription_subscribe_success", "last"].join('.')),
                        im.metrics.fire.sum(["total", "subscription_subscribe_success", "sum"].join('.'), 1)
                    ]);
                } else {
                    return Q.all([
                        im.metrics.fire.inc(["total", "subscription_subscribe_fail", "last"].join('.')),
                        im.metrics.fire.inc(["total", "subscription_subscribe_fail", "sum"].join('.'), 1)
                    ]);
                }
        });
    },

    subscription_unsubscribe_all: function(contact, im) {
        var params = {
            to_addr: contact.msisdn
        };
        return go.utils
        .control_api_call("get", params, null, 'subscription/', im)
        .then(function(json_result) {
            // make all subscriptions inactive
            var update = JSON.parse(json_result.data);
            var clean = true;  // clean tracks if api call is unnecessary
            for (i=0; i<update.objects.length; i++) {
                if (update.objects[i].active === true) {
                    update.objects[i].active = false;
                    clean = false;
                }
            }
            if (!clean) {
                return go.utils
                .control_api_call("patch", {}, update, 'subscription/', im)
                .then(function(result) {
                    if (result.code >= 200 && result.code < 300) {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_unsubscribe_success", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_unsubscribe_success", "sum"].join('.'), 1)
                        ]);
                    } else {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_unsubscribe_fail", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_unsubscribe_fail", "sum"].join('.'), 1)
                        ]);
                    }
                });
            } else {
                return Q();
            }
        });
    },

    opt_out: function(im, contact) {
        contact.extra.optout_last_attempt = go.utils.get_today(im.config);

        return Q.all([
            im.contacts.save(contact),
            go.utils.subscription_unsubscribe_all(contact, im),
            im.api_request('optout.optout', {
                address_type: "msisdn",
                address_value: contact.msisdn,
                message_id: im.msg.message_id
            })
        ]);
    },

    opt_in: function(im, contact) {
        contact.extra.optin_last_attempt = go.utils.get_today(im.config);
        return Q.all([
            im.contacts.save(contact),
            im.api_request('optout.cancel_optout', {
                address_type: "msisdn",
                address_value: contact.msisdn
            }),
        ]);
    },

    get_today: function(config) {
        var today;
        if (config.testing_today) {
            today = new moment(config.testing_today);
        } else {
            today = new moment();
        }
        return today.format('YYYY-MM-DD hh:mm:ss.SSS');
    },

    "commas": "commas"
};

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;
    var EndState = vumigo.states.EndState;


    var GoRR = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {

            // Use the metrics helper to add some metrics
            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                .add.total_unique_users('total.ussd.unique_users')

                // Total sessions
                .add.total_sessions('total.ussd.sessions')

                // Total times reached state_timed_out
                .add.total_state_actions(
                    {
                        state: 'state_timed_out',
                        action: 'enter'
                    },
                    'total.reached_state_timed_out'
                );

            // Load self.contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


    // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !go.utils.timed_out(self.im))
                    return creator(name, opts);

                interrupt = false;
                opts = opts || {};
                opts.name = name;
                return self.states.create('state_timed_out', opts);
            });
        };

        // timeout 01
        self.states.add('state_timed_out', function(name, creator_opts) {

            return new ChoiceState(name, {
                question: $('Would you like to continue where you left off?'),
                choices: [
                    new Choice('continue', $('Yes, continue')),
                    new Choice('restart', $('No, restart'))
                ],

                next: function(choice) {
                    return go.utils
                        .track_redials(self.contact, self.im, choice.value)
                        .then(function() {
                            if (choice.value === 'restart') {
                                return 'state_start';
                            } else {
                                return creator_opts.name;
                            }
                        });
                }
            });
        });

    // START STATE

        // delegator 01
        self.add('state_start', function(name) {
            return go.utils
                .set_language(self.im, self.contact)
                .then(function() {
                    if (self.contact.extra.status === 'refugee') {
                        return self.states.create('state_refugee_main');
                    } else if (self.contact.extra.status === 'migrant') {
                        return self.states.create('state_migrant_main');
                    } else {
                        return self.states.create('state_language');
                    }
                });
        });


    // REGISTRATION STATES

        // 001
        self.add('state_language', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome! Find info about migrants, asylum, refugees & support services. Please choose your language:'),
                choices: [
                    new Choice('en', $("English")),
                    new Choice('fr', $("French")),
                    new Choice('am', $("Amharic")),
                    new Choice('sw', $("Swahili")),
                    new Choice('so', $("Somali")),
                ],
                next: function(choice) {
                    return go.utils
                        .save_language(self.im, self.contact, choice.value)
                        .then(function() {
                            return 'state_country';
                        });
                }
            });
        });

        // 002
        self.add('state_country', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select your country of origin:'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('somalia', $('Somalia')),
                    new Choice('ethiopia', $('Ethiopia')),
                    new Choice('eritria', $('Eritrea')),
                    new Choice('drc', $('Democratic Republic of Congo')),
                    new Choice('burundi', $('Burundi')),
                    new Choice('kenya', $('Kenya')),
                    new Choice('rwanda', $('Rwanda')),
                    new Choice('sudan', $('Sudan/South Sudan')),
                    new Choice('zimbabwe', $('Zimbabwe')),
                    new Choice('uganda', $('Uganda')),
                    new Choice('egypt', $('Egypt')),
                    new Choice('mozambique', $('Mozambique')),
                    new Choice('syria', $('Syria')),
                    new Choice('angola', $('Angola')),
                ],
                next: function(choice) {
                    self.contact.extra.country = choice.value;
                    return Q.all([
                        self.im.contacts.save(self.contact)
                    ])
                    .then(function() {
                        return 'state_status';
                    });
                }
            });
        });

        // 003
        self.add('state_status', function(name) {
            return new ChoiceState(name, {
                question: $('Are you a refugee or migrant?'),
                choices: [
                    new Choice('who_is_refugee', $('Who is a refugee?')),
                    new Choice('who_is_migrant', $('Who is a migrant?')),
                    new Choice('neither', $('I am neither'))
                ],
                next: function(choice) {
                    if (choice.value === 'who_is_refugee') {
                        return 'state_who_refugee';
                    } else if (choice.value === 'who_is_migrant') {
                        return 'state_who_migrant';
                    } else if (choice.value === 'neither') {
                        self.contact.extra.status = 'neither';
                        return Q.all([
                            self.im.contacts.save(self.contact)
                        ])
                        .then(function() {
                            return 'state_neither';
                        });
                    }
                }
            });
        });

        // unknown 01
        self.add('state_neither', function(name) {
            return new EndState(name, {
                text: $('Unknown 01'),
                next: 'state_language'
            });
        });

        // 004
        self.add('state_who_refugee', function(name) {
            return new ChoiceState(name, {
                question: $('CONTENT 004'),
                choices: [
                    new Choice('refugee', $('Yes, I am a refugee')),
                    new Choice('back', $('No, back to menu'))
                ],
                next: function(choice) {
                    if (choice.value === 'back') {
                        return 'state_status';
                    } else {
                        return go.utils
                            .register_user(self.contact, self.im, choice.value)
                            .then(function() {
                                return 'state_refugee_rights_info';
                            });
                    }
                }
            });
        });

        // 005
        self.add('state_who_migrant', function(name) {
            return new ChoiceState(name, {
                question: $('CONTENT 005'),
                choices: [
                    new Choice('migrant', $('Yes, I am a migrant')),
                    new Choice('back', $('No, back to menu'))
                ],
                next: function(choice) {
                    if (choice.value === 'back') {
                        return 'state_status';
                    } else {
                        return go.utils
                            .register_user(self.contact, self.im, choice.value)
                            .then(function() {
                                return 'state_migrant_rights_info';
                            });
                    }
                }
            });
        });

        // 006
        self.add('state_refugee_rights_info', function(name) {
            return new PaginatedState(name, {
                text: $('Welcome to Refugee Rights. Here is some information and tips on how to user this service. Info info info info info info info  info info info info info info info info info info info info info info info info info info info info'),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        // 007
        self.add('state_migrant_rights_info', function(name) {
            return new PaginatedState(name, {
                text: $('Welcome to Migrant Rights. Here is some information and tips on how to user this service. Info info info info info info info  info info info info info info info info info info info info info info info info info info info info'),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });


    // MAIN MENU STATES

        // delegator 02
        self.add('state_main_menu', function(name) {
            if (self.contact.extra.status === 'refugee') {
                return self.states.create('state_refugee_main');
            } else if (self.contact.extra.status === 'migrant') {
                return self.states.create('state_migrant_main');
            }
        });

        // 010
        self.add('state_refugee_main', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('MAIN MENU'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('state_020', $('New to SA')),
                    new Choice('state_021', $('The asylum application process')),
                    new Choice('state_022', $('Asylum applications from children')),
                    new Choice('state_023', $('Permits')),
                    new Choice('state_024', $('Support services')),
                    new Choice('state_025', $('Right to work')),
                    new Choice('state_026', $('Health rights')),
                    new Choice('state_027', $('Education')),
                    new Choice('state_028', $('Social services')),
                    new Choice('state_029', $('Banking')),
                    new Choice('state_030', $('Tips page')),
                    new Choice('state_031', $('Helpful contact numbers')),
                    new Choice('state_032', $('Safety concerns')),
                    new Choice('state_033', $('Statelessness')),
                    new Choice('state_034', $('LGBTI rights')),
                    new Choice('state_035', $('Violence against women')),
                    new Choice('state_036', $('Word definitions')),
                    new Choice('state_037', $('More word definitions')),
                    new Choice('state_038', $('Change settings')),
                    new Choice('state_039', $('Ts & Cs of this service')),
                    new Choice('state_040', $('About LHR')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // 011
        self.add('state_migrant_main', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('MAIN MENU'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('state_060', $('New to SA')),
                    new Choice('state_061', $('The visa application process')),
                    new Choice('state_062', $('Unaccompanied / separated children')),
                    new Choice('state_063', $('Support services')),
                    new Choice('state_064', $('Employment')),
                    new Choice('state_065', $('Healthcare')),
                    new Choice('state_066', $('Education')),
                    new Choice('state_067', $('Banking')),
                    new Choice('state_068', $('Tips page')),
                    new Choice('state_069', $('Helpful contact numbers')),
                    new Choice('state_070', $('Safety concerns')),
                    new Choice('state_071', $('Statelessness')),
                    new Choice('state_072', $('LGBTI rights')),
                    new Choice('state_073', $('Violence against women')),
                    new Choice('state_074', $('Change settings')),
                    new Choice('state_075', $('Ts & Cs of this service')),
                    new Choice('state_076', $('Word definitions')),
                    new Choice('state_077', $('More word definitions')),
                    new Choice('state_078', $('About LHR')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

    });

    return {
        GoRR: GoRR
    };
}();
go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoRR = go.app.GoRR;

    return {
        im: new InteractionMachine(api, new GoRR())
    };
}();
