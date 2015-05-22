// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

var Q = require('q');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var JsonApi = vumigo.http.api.JsonApi;

// Shared utils lib
go.utils = {

    timed_out: function(im) {
        var no_redirects = ['state_language', 'state_migrant_main', 'state_refugee_main',
                            'state_locate_exit'];
        return im.msg.session_event === 'new'
            && im.user.state.name
            && no_redirects.indexOf(im.user.state.name) === -1;
    },

    eval_dialback_reminder: function(e, im, contact, $) {
        return go.utils.should_send_dialback_reminder(e, contact)
            ? go.utils.send_dialback_reminder(im, contact, $)
            : Q();
    },

    should_send_dialback_reminder: function(e, contact) {
        var dialback_states = [
            'state_language',
            'state_country',
            'state_status',
            'state_who_refugee',
            'state_who_migrant',
            'state_refugee_rights_info',
            'state_migrant_rights_info'
        ];
        return e.user_terminated
            && (contact.extra.dialback_reminder_sent !== 'true')
            && dialback_states.indexOf(e.im.state.name) !== -1;
    },

    send_dialback_reminder: function(im, contact, $) {
        return im.outbound
            .send_to_user({
                endpoint: 'sms',
                content: go.utils.get_dialback_reminder_sms(im, $)
            })
            .then(function() {
                contact.extra.dialback_reminder_sent = 'true';
                return im.contacts.save(contact);
            });
    },

    get_dialback_reminder_sms: function(im, $) {
        return $("Please dial back in to {{ USSD_number }} to complete the registration.")
            .context({
                USSD_number: im.config.channel
            });
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

    update_language: function(im, contact, lang) {
        return go.utils
            .save_language(im, contact, lang)
            .then(function() {
                return Q.all([
                    go.utils.subscription_update_language(im, contact),
                    im.metrics.fire.inc(['total', 'change_language', 'last'].join('.')),
                    im.metrics.fire.sum(['total', 'change_language', 'sum'].join('.'), 1)
                ]);
            });
    },

    update_country: function(im, contact, country) {
        contact.extra.country = country;
        return Q.all([
            im.contacts.save(contact),
            im.metrics.fire.inc(['total', 'change_country', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'change_country', 'sum'].join('.'), 1)
        ]);
    },

    update_status: function(im, contact, status) {
        contact.extra.status = status;
        return Q.all([
            im.contacts.save(contact),
            im.metrics.fire.inc(['total', 'change_status', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'change_status', 'sum'].join('.'), 1)
        ]);
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
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.api_key]
            }
        });
        switch (method) {
            case "post":
                return http.post(im.config.control.url + endpoint, {
                    data: payload
                });
            case "get":
                return http.get(im.config.control.url + endpoint, {
                    params: params
                });
            case "patch":
                return http.patch(im.config.control.url + endpoint, {
                    data: payload
                });
            case "put":
                return http.put(im.config.control.url + endpoint, {
                    params: params,
                  data: payload
                });
            case "delete":
                return http.delete(im.config.control.url + endpoint);
            }
    },

    subscription_subscribe: function(contact, im) {
        var payload = {
            contact_key: contact.key,
            to_addr: contact.msisdn,
            lang: contact.extra.lang,
            messageset_id: 1,
            schedule: 1
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

    subscription_update_language: function(im, contact) {
        var params = {
            to_addr: contact.msisdn
        };
        return go.utils
        .control_api_call("get", params, null, 'subscription/', im)
        .then(function(json_result) {
            // change all subscription languages
            var update = json_result.data;
            var clean = true;  // clean tracks if api call is unnecessary
            for (i=0; i<update.objects.length; i++) {
                if (update.objects[i].lang !== contact.extra.lang) {
                    update.objects[i].lang = contact.extra.lang;
                    clean = false;
                }
            }
            if (!clean) {
                return go.utils
                .control_api_call("patch", {}, update, 'subscription/', im)
                .then(function(result) {
                    if (result.code >= 200 && result.code < 300) {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_lang_update_success", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_lang_update_success", "sum"].join('.'), 1)
                        ]);
                    } else {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_lang_update_fail", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_lang_update_fail", "sum"].join('.'), 1)
                        ]);
                    }
                });
            } else {
                return Q();
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
            var update = json_result.data;
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

    date_difference: function(date1, date2) {
        // returns the difference between the dates in days - true adds decimals
        return moment(date1).diff(moment(date2), 'days', true);
    },

    fire_returning_user_metrics: function(im, contact) {
        var today = go.utils.get_today(im.config);
        contact.extra.last_seen = today;
        var user_registered = contact.extra.status === 'refugee' || contact.extra.status === 'migrant';
        var no_last_returning_metric = contact.extra.last_returning_metric_fire === undefined;
        var old_last_returning_metric = go.utils.date_difference(today, contact.extra.last_returning_metric_fire) > 7;

        // For tracking weekly returning users. Only tracking returning registered users.  If the
        // user has never returned before or the user was last tracked more than a week ago, it
        // should fire a new metric and save the fact to the contact
        if (user_registered && (no_last_returning_metric || old_last_returning_metric)) {
            contact.extra.last_returning_metric_fire = today;
            return Q.all([
                im.metrics.fire.inc(["total", "returning_users", "last"].join('.')),
                im.metrics.fire.sum(["total", "returning_users", "sum"].join('.'), 1),
                im.contacts.save(contact)
            ]);
        } else {
            return im.contacts.save(contact);
        }
    },

    fire_main_menu_metrics: function(im, from_state, to_state) {
        return Q.all([
            im.metrics.fire.inc(["total", from_state, to_state, "last"].join('.')),
            im.metrics.fire.sum(["total", from_state, to_state, "sum"].join('.'), 1)
        ]);
    },

    locate_poi: function(im, contact) {
        var req_lookup_url = im.config.location_api_url + 'requestlookup/';
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.api_key]
            }
        });
        return http.post(req_lookup_url, {
            data: go.utils.make_lookup_data(im, contact, go.utils.make_user_location_data(contact))
        })
        .then(function(response) {
            contact.extra.poi_url = response.data.url;
            return Q.all([
                im.contacts.save(contact),
                im.metrics.fire.inc(["total", "location_queries", "last"].join('.')),
                im.metrics.fire.inc(["total", "location_queries", "sum"].join('.'), 1)
            ]);
        });
    },

    make_user_location_data: function(contact) {
        var location_data = {
            point: {
                type: "Point",
                coordinates: [
                    parseFloat(contact.extra['location:lon']),
                    parseFloat(contact.extra['location:lat'])
                ]
            }
        };
        return location_data;
    },

    make_lookup_data: function(im, contact, user_location) {
        var lookup_data = {
            search: go.utils.make_poi_search_params(im),
            response: {
                type: "USSD",
                to_addr: contact.msisdn,
                template: im.config.template,  // used for SMS only
                results: "",
                results_detailed: '[]'
            },
            location: user_location
        };
        return lookup_data;
    },

    make_poi_search_params: function(im) {
        var poi_type_wanted = "all";  // hardcoded as no more info currently available
        var search_data = {};

        if (poi_type_wanted === "all") {
            im.config.poi_types.forEach(function(poi_type) {
                search_data[poi_type] = "true";
            });
        } else {
            search_data[poi_type_wanted] = "true";
        }
        return search_data;
    },

    get_poi_results: function(im, contact) {
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.api_key]
            }
        });
        return http
            .get(contact.extra.poi_url)
            .then(function(response) {
                return JSON.parse(response.data.response.results_detailed);
            });
    },

    shorten_province: function(province) {
        var province_shortening = {
            'Gauteng': 'GP',
            'Mpumalanga': 'MP',
            'Limpopo': 'LP',
            'North West': 'NW',
            'Eastern Cape': 'EC',
            'Western Cape': 'WC',
            'Northern Cape': 'NC',
            'KwaZulu-Natal': 'KZN',
            'Free State': 'FS'
        };
        return province_shortening[province];
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
    var location = require('go-jsbox-location');
    var LocationState = location.LocationState;
    var OpenStreetMap = location.providers.openstreetmap.OpenStreetMap;


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

            // Record returning users metrics
            self.im.on('session:new', function(e) {
                return go.utils.fire_returning_user_metrics(self.im, self.contact);
            });

            // Send a dial back reminder via sms the first time someone times out
            self.im.on('session:close', function(e) {
                return go.utils.eval_dialback_reminder(e, self.im, self.contact, $);
            });

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
                    new Choice('eritrea', $('Eritrea')),
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
                    new Choice('state_who_refugee', $('Who is a refugee?')),
                    new Choice('state_who_migrant', $('Who is a migrant?')),
                    new Choice('state_refugee_rights_info', $('I am a refugee')),
                    new Choice('state_migrant_rights_info', $('I am a migrant')),
                    new Choice('state_neither', $('I am neither'))
                ],
                next: function(choice) {
                    if (choice.value === 'state_who_refugee' || choice.value === 'state_who_migrant') {
                        return choice.value;
                    } else if (choice.value === 'state_neither') {
                        self.contact.extra.status = 'neither';
                        return self.im.contacts
                            .save(self.contact)
                            .then(function() {
                                return choice.value;
                            });
                    } else {
                        var status = (choice.value === 'state_refugee_rights_info') ? 'refugee' : 'migrant';
                        return go.utils
                            .register_user(self.contact, self.im, status)
                            .then(function() {
                                return choice.value;
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
            return new PaginatedState(name, {
                text: $("If you fled from your country in fear of your life due to your race, religion, nationality, gender, political or social group. Or; if your life, safety or freedom in your home country are at risk because of violence, war & civil unrest. Or; if you are married to or depend upon a person who fled their country in fear of their life for the reasons listed. You are entitled to refugee status if you are married to a recognised refugee, even if your own claim was rejected."),
                characters_per_page: 160,
                back: $('<-'),
                more: $('->'),
                exit: $('OK'),
                next: 'state_status'
            });
        });

        // 005
        self.add('state_who_migrant', function(name) {
            return new PaginatedState(name, {
                text: $("If you have come to SA to look for a job, study, visit friends & family or run a business. You need to apply for a visa.Remember: a migrant can become a refugee should one of the reasons for refugee status takes place in their country of origin."),
                characters_per_page: 160,
                back: $('<-'),
                more: $('->'),
                exit: $('OK'),
                next: 'state_status'
            });
        });

        // 006
        self.add('state_refugee_rights_info', function(name) {
            return new PaginatedState(name, {
                text: $("Welcome! This is a step-by-step guide for foreign nationals in South Africa. Read all the Menu options to find the help you need. Choose 'Word Definitions' for an explanation of words you may not be familiar with. Choose 'Tips' for a short-cut to helpful advice at each stage of your visa process - with more detail in each Menu section. Choose 'Useful Contacts' for the phone numbers of government, private or support organisations that can help. Remember: this service might not have all the information you're looking for. If your case is complicated, consult a lawyer from LHR."),
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
                text: $("Welcome! This is a step-by-step guide for foreign nationals in South Africa. Read all the Menu options to find the help you need. Choose 'Word Definitions' for an explanation of words you may not be familiar with. Choose 'Tips' for a short-cut to helpful advice at each stage of your visa process - with more detail in each Menu section. Choose 'Useful Contacts' for the phone numbers of government, private or support organisations that can help. Remember: this service might not have all the information you're looking for. If your case is complicated, consult a lawyer from LHR."),
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
                    new Choice('state_031', $('Useful contacts')),
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
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'refugee', choice.value)
                        .then(function() {
                            return choice.value;
                        });
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
                    new Choice('state_068', $('LGBTI rights')),
                    new Choice('state_069', $('Violence against women & children')),
                    new Choice('state_070', $('Safety concerns')),
                    new Choice('state_071', $('Statelessness')),
                    new Choice('state_072', $('Change settings')),
                    new Choice('state_073', $('Ts & Cs of this service')),
                    new Choice('state_074', $('Word definitions')),
                    new Choice('state_075', $('More word definitions')),
                    new Choice('state_076', $('Tips')),
                    new Choice('state_077', $('Useful contacts')),
                    new Choice('state_078', $('About LHR')),
                ],
                next: function(choice) {
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'migrant', choice.value)
                        .then(function() {
                            return choice.value;
                        });
                }
            });
        });


    // LOCATION FINDING STATES

        // state_locate_me
        self.states.add('state_locate_me', function(name) {
            return new LocationState(name, {
                question:
                    $("To find your closest SService we need to know " +
                      "what suburb or area u are in. Please be " +
                      "specific. e.g. Inanda Sandton"),
                refine_question:
                    $("Please select your location:"),
                error_question:
                    $("Sorry there are no results for your location. " +
                      "Please re-enter your location again carefully " +
                      "and make sure you use the correct spelling."),
                next: 'state_locate_SService',
                next_text: 'More',
                previous_text: 'Back',

                map_provider: new OpenStreetMap({
                    bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                    address_limit: 4,

                    extract_address_data: function(result) {
                        var formatted_address;
                        var addr_from_details = [];
                        if (!result.address) {
                            formatted_address = result.display_name;
                        } else {
                            result.address.city = result.address.city ||
                                result.address.town || result.address.village;

                            var addr_details = ['suburb', 'city', 'state'];

                            addr_details.forEach(function(detail) {
                                if (result.address[detail] !== undefined) {
                                    addr_from_details.push(result.address[detail]);
                                } else {
                                    addr_from_details.push('n/a');
                                }
                            });

                            formatted_address = addr_from_details.join(', ');
                        }
                        return {
                            formatted_address: formatted_address,
                            lat: result.lat,
                            lon: result.lon,
                            suburb: addr_from_details[0],
                            city: addr_from_details[1],
                            province: addr_from_details[2]
                        };
                    },

                    extract_address_label: function(result) {
                        if (!result.address) {
                            return result.display_name;
                        } else {
                            result.address.city = result.address.city ||
                                result.address.town || result.address.village;

                            var addr_details = ['suburb', 'city', 'state'];
                            var addr_from_details = [];

                            addr_details.forEach(function(detail) {
                                if (result.address[detail] !== undefined) {
                                    if (detail === 'state') {
                                        result.address[detail] = go.utils
                                                        .shorten_province(result.address[detail]);
                                    }
                                    addr_from_details.push(result.address[detail]);
                                }
                            });

                            return addr_from_details.join(', ');
                        }
                    }
                })
            });
        });

        // state_locate_SService
        self.states.add('state_locate_SService', function(name) {
            // reload the contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                })
                .then(function() {
                    // send the post request
                    return go.utils
                        .locate_poi(self.im, self.contact)
                        .then(function() {
                            return self.states.create(
                                'state_locate_stall_initial');
                        });
                });
        });

        // state_locate_stall_initial
        self.add('state_locate_stall_initial', function(name) {
            return new ChoiceState(name, {
                question: $("The system is looking up services near you. This usually takes less than a minute."),
                choices: [
                    new Choice('state_locate_get_results', $("View services"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // state_locate_stall_again
        self.add('state_locate_stall_again', function(name) {
            return new ChoiceState(name, {
                question: $("The system was still busy finding your services. Please try again now or choose Exit and dial back later."),
                choices: [
                    new Choice('state_locate_get_results', $("View services")),
                    new Choice('state_locate_exit', $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // state_locate_exit
        self.add('state_locate_exit', function(name) {
            return new EndState(name, {
                text: $('Please dial back in a few minutes to see your services results'),
                next: 'state_locate_stall_again'
            });
        });


        // state_locate_get_results
        self.add('state_locate_get_results', function(name) {
            return go.utils.get_poi_results(self.im, self.contact)
            .then(function(poi_results) {
                if (poi_results.length === 0) {
                    // stall again if results are not available
                    // TODO handle search complete but no results found
                    return self.states.create('state_locate_stall_again');
                } else {
                    var opts = { poi_results: poi_results };
                    return self.states.create('state_locate_show_results', opts);
                }
            });
        });

        // state_locate_show_results
        self.add('state_locate_show_results', function(name, opts) {
            var choices = [];
            var index = 0;
            var poi_results = opts.poi_results;
            poi_results.forEach(function(poi_result) {
                poi_name = poi_result[1].slice(0, poi_result[1].indexOf('(')).trim();
                choices.push(new Choice(index.toString(), poi_name));
                index++;
            });

            return new ChoiceState(name, {
                question: $('Select a service for more info'),
                choices: choices,
                next: function(choice) {
                    var opts = {
                        poi_results: poi_results,
                        poi_details: poi_results[choice.value][1]
                    };
                    return self.states.create('state_locate_details', opts);
                }
            });
        });

        // state_locate_details
        self.add('state_locate_details', function(name, opts) {
            var poi_results = opts.poi_results;
            return new PaginatedState(name, {
                // TODO test for possible translation problems here
                text: $(opts.poi_details),
                characters_per_page: 160,
                exit: $('Exit'),
                back: $('Back'),
                more: $('More'),
                next: function() {
                    var opts = { poi_results: poi_results };
                    return self.states.create('state_locate_show_results', opts);
                }
            });
        });


    // REFUGEE MENU STATES

        // 024
        self.add('state_024', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_locate_me', $("Find nearest SService"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });



    // MIGRANT MENU STATES

        // 060
        self.add('state_060', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_100', $('Who is a refugee?')),
                    new Choice('state_101', $('Who is a migrant?'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 100
            self.add('state_100', function(name) {
                return new PaginatedState(name, {
                    text: $("If you fled from your country in fear of your life due to your race, religion, nationality, gender, political or social group. Or; if your life, safety or freedom in your home country are at risk because of violence, war and civil unrest. Or; if you are married to or depend upon a person who fled their country in fear of their life for the reasons listed. You are entitled to refugee status if you are married to a recognised refugee, even if your own claim was rejected."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 101
            self.add('state_101', function(name) {
                return new PaginatedState(name, {
                    text: $("If you have come to SA to look for a job, study, visit friends & family or run a business. You need to apply for a visa. Remember: a migrant can become a refugee should one of the reasons for refugee status takes place in their country of origin."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 061
        self.add('state_061', function(name) {
            return new ChoiceState(name, {
                question: $('Select your type of application'),
                choices: [
                    new Choice('state_102', $('Temporary & permanent visa applications')),
                    new Choice('state_103', $('Temporary residence visas')),
                    new Choice('state_104', $('Types of temporary visas')),
                    new Choice('state_105', $('Permanent residence visas')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 102
            self.add('state_102', function(name) {
                return new PaginatedState(name, {
                    text: $("The visa application process has changed. Find out what you will need to apply for a visa in SA. There's more on www.vfsglobal.com. There are 2 types of residence permits: one is temporary, the other is permanent. (A visa is the same as a permit.)"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 103
            self.add('state_103', function(name) {
                return new PaginatedState(name, {
                    text: $("To apply for a temporary residence permit, your passport must be valid. It must stay valid for 30 days after your permit expires. Extend your temporary residence permit 30 days before it expires at any Home Affairs office. You will have to pay a fee. TIP: Hand in your application at any of the 11 VFS Global offices in SA. Go to www.vfsglobal.com for more info.There are 14 types of temporary residence visas. Choose one from this list. Visit www.vfsglobal.com for info on fees, documents & more."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 104
            self.add('state_104', function(name) {
                return new PaginatedChoiceState(name, {
                    question: $('Select an option'),
                    characters_per_page: 160,
                    options_per_page: null,
                    more: $('Next'),
                    back: $('Back'),
                    choices: [
                        new Choice('state_150', $("Treaty")),
                        new Choice('state_151', $("Visitor")),
                        new Choice('state_152', $("Exchange")),
                        new Choice('state_153', $("General work")),
                        new Choice('state_154', $("Retired person")),
                        new Choice('state_155', $("Business")),
                        new Choice('state_156', $("Relative")),
                        new Choice('state_157', $("Corporate")),
                        new Choice('state_158', $("Intra company work transfer")),
                        new Choice('state_159', $("Critical skills")),
                        new Choice('state_160', $("Medical")),
                        new Choice('state_161', $("Study")),
                        new Choice('state_162', $("Transfer of temporary residence")),
                        new Choice('state_163', $("Fix a mistake on a temporary visa"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });

                // 150
                self.add('state_150', function(name) {
                    return new PaginatedState(name, {
                        text: $("Treaty: When there is a deal between SA & your country. You can enter SA to take part in certain activities or programmes."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 151
                self.add('state_151', function(name) {
                    return new PaginatedState(name, {
                        text: $("Visitor: For short visits to SA to travel, do business, visit family or friends or attend sports events."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 152
                self.add('state_152', function(name) {
                    return new PaginatedState(name, {
                        text: $("Exchange: When you are younger than 25 years & want to take part in an exchange programme between your country & SA."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 153
                self.add('state_153', function(name) {
                    return new PaginatedState(name, {
                        text: $("General work: This allows you to work in SA. You need to prove you have work & meet other conditions, or it will expire after 6 months."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 154
                self.add('state_154', function(name) {
                    return new PaginatedState(name, {
                        text: $("Retired person: When you are elderly & want to retire in SA. There are financial requirements you need to meet."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 155
                self.add('state_155', function(name) {
                    return new PaginatedState(name, {
                        text: $("Business: When you want to open a business or become part of a business in SA. You will need to invest money first."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 156
                self.add('state_156', function(name) {
                    return new PaginatedState(name, {
                        text: $("Relative: When you are a direct family member of a South African citizen or permanent resident."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 157
                self.add('state_157', function(name) {
                    return new PaginatedState(name, {
                        text: $("Corporate: Groups of factory or farm workers can apply for a corporate worker visa. You need a copy of the main corporate visa application."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 158
                self.add('state_158', function(name) {
                    return new PaginatedState(name, {
                        text: $("Intra company work transfer: When the company you work for in your home country sends you to work in their SA office."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 159
                self.add('state_159', function(name) {
                    return new PaginatedState(name, {
                        text: $("Critical skills: When your skills are needed in SA. For a list of critical skills, go to www.vfsglobal.com."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 160
                self.add('state_160', function(name) {
                    return new PaginatedState(name, {
                        text: $("Medical: When you travel to SA for medical care. You can't work or stay longer than 3 months. You must be able to pay for the treatment."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 161
                self.add('state_161', function(name) {
                    return new PaginatedState(name, {
                        text: $("Study: If you are a student and want to study in SA. You can work while you study, but certain rules apply."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 162
                self.add('state_162', function(name) {
                    return new PaginatedState(name, {
                        text: $("Transfer of temporary residence: Lost or stolen passport? Transfer your temporary residence visa to your new passport."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 163
                self.add('state_163', function(name) {
                    return new PaginatedState(name, {
                        text: $("Fix a mistake on a temporary visa: Fix a mistake at any VFS office in SA. You may have to pay a fee."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            // 105
            self.add('state_105', function(name) {
                return new PaginatedState(name, {
                    text: $("You & your spouse may need to go for an interview with a Home Affairs officer. Submit a signed BI947 form with your documents & fee. Need proof of your permanent residence visa? Fill in a form on www.vfsglobal.com Make an appointment at VFS. Take your documents & pay a fee. You can fix a mistake on your visa application at any VFS office in SA. You may have to pay a fee."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 062
        self.add('state_062', function(name) {
            return new PaginatedState(name, {
                text: $("Children without a parent or guardian must be referred to the Dept. of Social Development. A social worker will be assigned to the child. The social worker will go to the Children's Court. The court will confirm if the child is in need of care. The social worker will verify the child's placement in a temporary place of safety. A report must be compiled. If the child is a migrant, the social worker must try to find & reunite the family in the country of origin. If the family can't be located & the child can't be returned home, you must contact a legal counsellor. This is important: children must get documented as soon as possible, otherwise they risk becoming stateless."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });


        // 063
        self.add('state_063', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_106', $("Legal advice")),
                    new Choice('state_107', $("Arrest & detention")),
                    new Choice('state_108', $("What to do if you're arrested")),
                    new Choice('state_109', $("Conditions of arrest & detention")),
                    new Choice('state_110', $("The Deportation Centre"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 106
            self.add('state_106', function(name) {
                return new PaginatedState(name, {
                    text: $("If you have visa application problems, a lawyer can help with the process. Know your rights! Lawyers for Human Rights (LHR) can offer free advice under certain situations. LHR normally helps asylum seekers and refugees. If you need general legal help with an immigration issue you must hire a private lawyer. TIP: Always ask about a lawyer's fees before you accept their services. TIP: Always ensure your lawyer has the right qualifications. If you're unsure, contact the Law Society of SA on 012-366-8800."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 107
            self.add('state_107', function(name) {
                return new PaginatedState(name, {
                    text: $("Valid permit holders are safe from arrest or detention - unless you break the law. There are other exceptional circumstances. Police or immigration officials may request that you provide proof of your regularised stay in the country. Failing which, you may be arrested or detained. If you are arrested, you must prove that you are allowed to be in SA. Remember: You must have a valid visa. You will go to a police station. You will stay there until the DHA verifies your identity. They need to do so within 48 hours. Never bribe a police or immigration officer to avoid being arrested, or to get out of jail. This is against the law! TIP: Always carry your valid visa or certified copy with you. This is proof that you are allowed to stay in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 108
            self.add('state_108', function(name) {
                return new PaginatedState(name, {
                    text: $("There are legal ways out of your arrest. It may take time. Ask to speak to a lawyer. It is your right. If you are arrested and have a valid visa, ask a friend or family to give copies of your valid documents to the DHA. Remember: You have the right to get legal representation if you are arrested. TIP: If you go to a magistrate's court, you can ask for 'legal aid'. You will be able to speak to a lawyer for free."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 109
            self.add('state_109', function(name) {
                return new PaginatedState(name, {
                    text: $("The immigration or DHA officer should verify your documents within 48 hours. If not, you must be released. It is your responsibility to carry your documentation on you. Otherwise, the officer must assist you in locating your documents. You have the right to a free phone call to get copies of your permit. The officer must attempt to confirm your status with the DHA. It's your right to write a statement to the DHA. In the statement you can disagree with the decision to detain or deport you. You may not be detained for more than 30 days, unless the court confirms, with a warrant, that you can be detained longer than 30 days. You may write a statement to the judge. When the court makes its decision, you must be informed of this in writing."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 110
            self.add('state_110', function(name) {
                return new PaginatedState(name, {
                    text: $("If you are taken to the Deportation Centre, you may contact a lawyer for legal advice. LHR visits the centre every week. Ask your family to notify Lawyers for Human Rights about your situation and that you need help. If you don't have legitimate reasons to stay in SA with the necessary documents, you'll be kept at the centre & deported back home. Contact Lawyers for Human Rights if your conditions of detention are unsafe or violate your dignity."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 064
        self.add('state_064', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select an option'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('state_111', $('Your employment rights')),
                    new Choice('state_112', $('Setting up your own business')),
                    new Choice('state_113', $('Provincial laws')),
                    new Choice('state_079', $('By-laws')),
                    new Choice('state_080', $('Working for a salary')),
                    new Choice('state_123', $('Unfair discrimination')),
                    new Choice('state_124', $('UIF & Compensation Fund'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 111
            self.add('state_111', function(name) {
                return new PaginatedState(name, {
                    text: $("As a migrant you need a relevant work visa to work in SA. With the right visa you can be employed or run your own business. Remember: if you want to set up your own business in South Africa, you need to have a valid business permit."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 112
            self.add('state_112', function(name) {
                return new PaginatedState(name, {
                    text: $("You must first register your business at the CIPC. Find out if your business needs a licence. If you sell food you need a business licence. To obtain a licence, fill out an application form at your municipality. Take copies of your valid permit with you and pay a small fee. At some municipalities you may have to hand in extra documents, like health & safety inspection certificates. After you've handed in your application, a health & safety officer will visit your business site for inspection. Don't bribe the official! If you don't meet the health & safety rules, you must make the changes required.You won't get a licence until you do. When your business meets all the health & safety rules, you will get your business licence. Now you can start to trade. The health & safety officer may inspect your business site again. You need to follow the health & safety rules at all times. Check whether there is an expiry date on your business licence. If there is, make sure you renew it on time."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 113
            self.add('state_113', function(name) {
                return new PaginatedState(name, {
                    text: $("Every province in SA is allowed to pass laws. Make sure you know the business laws of the area you want to trade in. To trade in KZN, Limpopo, Mpumalanga & North-West Province you need a business licence with health & safety approval. In Limpopo, licences are valid for 1 year. Renew your licence 1 month before it expires or you'll be fined or imprisoned. In KwaZulu-Natal you cannot make changes to the building from which your business trades. You need permission first. Hawkers, peddlars & street vendors in Mpumalanga don't need a licence. You may need to prove that your stall area is assigned to you. You can contact Lawyers for Human Rights in Johannesburg or Pretoria if you need a copy of these laws. See 'Useful Contacts'."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 079
            self.add('state_079', function(name) {
                return new ChoiceState(name, {
                    question: $('Select an option'),
                    choices: [
                        new Choice('state_164', $("About")),
                        new Choice('state_114', $("Cape Town by-laws")),
                        new Choice('state_115', $("Pretoria by-laws")),
                        new Choice('state_116', $("Durban by-laws")),
                        new Choice('state_117', $("Port Elizabeth by-laws")),
                        new Choice('state_118', $("Johannesburg by-laws"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });

                // 164
                self.add('state_164', function(name) {
                    return new PaginatedState(name, {
                        text: $("The laws of a municipality are called by-laws. By-laws control the way businesses and services work in that area. By-laws are not valid outside of the municipalities in which they are passed. Know the by-laws of the municipality you want to trade in. TIP: It's important to obey all the by-laws. If you don't follow the by-laws, you may lose your goods or go to jail."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 114
                self.add('state_114', function(name) {
                    return new PaginatedState(name, {
                        text: $("The application fee may be cancelled if you can prove you can't pay it. You also need to hand in a written explanation. The city needs to give you enough notice if you are asked to move your business, or if your permit is cancelled. Your permit can be passed on to someone else on death, illness or if you have long-lasting cultural or religious duties. Informal traders can't block traffic or trade next to important or religious buildings, national monuments or fire hydrants. Your trading site must be clean. If you don't follow the by-laws your property can be impounded. You will pay a penalty. If you can't claim your impounded goods within 1 month, it may be sold or destroyed. The city may sell your impounded food products. You can get some money if you paid the penalty & have an inventory list. If you break any of the by-laws you can be fined R5000 or go to prison for 3 months. Go to www.capetown.gov.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 115
                self.add('state_115', function(name) {
                    return new PaginatedState(name, {
                        text: $("You can't trade in or next to public facilities (like toilets, pools or parks) or ATMs unless you have permission. You can't trade next to important, religious or heritage buildings or in front of fire hydrants. You can't block any traffic. If your stall is in a public space, it can't be larger than 3 square meters. Your stall and goods must be removed at the end of the day. You may be asked to move your stall for a short while if the city needs to work on the road or the space you're trading in. Your stall must be kept clean at all times. You are not allowed to sleep in your stall at night. You can rent a stall from the local authority. You'll get a lease agreement & a token to prove your lease to the police. Children aren't allowed to trade. If you break any of the by-laws, an authorised official can take away your products. Go to www.tshwane.gov.za or call 012-358-9999 for more information."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 116
                self.add('state_116', function(name) {
                    return new PaginatedState(name, {
                        text: $("Preference will be given to permit applications made by the unemployed, registered taxpayers or those new to the informal sector. Your permit may have an expiry date. Check other conditions like trading hours, products you can trade & allowed stall types. Your permit must be for a specific trading bay. You aren't allowed to build structures for your stall. Your permit can be cancelled if you don't follow the rules, if you give the wrong information or if you sell illegal goods. Before your permit is cancelled, you're allowed to make a written statement first. Go to www.durban.gov.za for more info. You may not sleep in your stall at night. Your products cannot cover a public space area bigger than 6 square meters. No trading next to public & religious buildings, national monuments, homes, CCTV cameras, ATMs, fire hydrants or blocking traffic. You can only use an open-flame or gas fire if you are allowed to cook food. Your stall must be clean at all times."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 117
                self.add('state_117', function(name) {
                    return new PaginatedState(name, {
                        text: $("No trading in public parks, monuments or important buildings, near fire hydrants, ATMs or blocking traffic. Your stall & goods must be removed at the end of the day, unless you have permission from the municipality. You can't sleep in your stall at night or put your stall on a public road or facility. It must be kept clean at all times. You may be asked to move your stall for a short while if the city needs to clean or work in the area where you trade. You cannot sell your products in front of another business that sells the same products. If you trade where you're not allowed to, an official can take away your goods. Remember: you must get a written receipt. Your receipt for impounded goods must say where, when & how you can get your goods back. Unclaimed goods will be sold. If you break the by-laws, you can be fined or imprisoned for up to 3 months. Go to www.nelsonmandelabay.gov.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 118
                self.add('state_118', function(name) {
                    return new PaginatedState(name, {
                        text: $("You can rent a stall from the local authority. You'll get a lease agreement & a token to prove your lease to the police. Your stall must be kept clean at all times. You cannot sleep in your stall at night. Your permit may have an expiry date. Check other conditions like trading hours, products you can trade & allowed stall types. No trading in parks, important/religious buildings, public monuments, near fire hydrants, ATMs or blocking traffic. Your goods can't cover a public area bigger than 6 square meters. If you're trading in front of a shop, you can't block the window. If you trade where you're not allowed to, an official can take away your goods. Remember: you must get a written receipt. Your receipt for impounded goods must say where, when & how much it will cost to get your goods back. If you break any of the by-laws you may be fined up to R500 or 3 months in jail. Go to www.joburg.org.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            // 080
            self.add('state_080', function(name) {
                return new ChoiceState(name, {
                    question: $('Select an option'),
                    choices: [
                        new Choice('state_119', $("Security or car guard")),
                        new Choice('state_120', $("Nurse")),
                        new Choice('state_121', $("Medical doctor")),
                        new Choice('state_122', $("Teacher")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });

                // 119
                self.add('state_119', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. Security & car guards must register at PSIRA. SA nationals, permanent residents & refugees with immunity can work as guards."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 120
                self.add('state_120', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. If you are a qualified nurse with the correct work visa you can apply to work as a nurse in SA. The South African Nursing Council (SANC) processes applications for nurses with qualifications from foreign countries."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 121
                self.add('state_121', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. If you are a qualified medical doctor with the correct work visa you can apply to register as a doctor in SA. The Department of Health (DOH) employs foreign doctors with the right qualifications & experience in government hospitals. To register, contact the Department of Health's Foreign Workforce Management Programme (FWMP) on 012 312 0467. To register, you need a job offer from a government hospital or health department. Apply for a formal endorsement from FWMP. When you have a job offer & endorsement, apply to register with the Health Professions Council of SA (HPCSA) 012-338-9350."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 122
                self.add('state_122', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. If you are a public school teacher you need to check your international teaching qualification with the SA Qualifications Authority (SAQA). The SAQA evaluation doesn't guarantee a job. Also register with SA Council for Educators (SACE). Go to www.sace.org.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            // 123
            self.add('state_123', function(name) {
                return new PaginatedState(name, {
                    text: $("There are laws in SA that protect you from discrimination or unfair treatment when you are at work. Your employer can't discriminate against you because you're an immigrant. The law protects you from unfair treatment. The law also protects your minimum working hours, leave, salary & the way you are dismissed."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 124
            self.add('state_124', function(name) {
                return new PaginatedState(name, {
                    text: $("You can claim from the UIF if you end up unemployed because you're sick or have a baby. You need a 13-digit ID number to claim. If you are hurt or become infected with a disease at work & you end up being disabled, the Compensation Fund will pay out money. If you die because of your injuries your dependants will get money. The Compensation Fund will help to pay the medical bills."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 065
        self.add('state_065', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select an option'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('state_125', $("Your visa holder rights")),
                    new Choice('state_126', $("Health care costs")),
                    new Choice('state_127', $("Clinics & hospitals")),
                    new Choice('state_128', $("Trauma assistance")),
                    new Choice('state_129', $("HIV/AIDS")),
                    new Choice('state_130', $("More about HIV/AIDS")),
                    new Choice('state_134', $("Help & treatment for sexual abuse"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 125
            self.add('state_125', function(name) {
                return new PaginatedState(name, {
                    text: $("Apply for a medical visa in your country before you travel to SA to get medical care. See Temporary Visa section for info. Remember: this visa doesn't mean you will get free health care. You will have to pay for it yourself. Already in SA with a visa? You have the right to access medical care just like anybody else. Hospital workers don't always know the rights of migrants with valid visas. It's your right to access public health services. You can contact Lawyers for Human Rights when you've a problem accessing public health services."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 126
            self.add('state_126', function(name) {
                return new PaginatedState(name, {
                    text: $("People from SADC countries pay the same medical fees as SA residents. You need an ID to prove you're from a SADC country. SADC countries: Angola, Botswana, DRC, Lesotho, Malawi, Mauritius, Mozambique, Namibia, Swaziland, Tanzania, Zambia, Zimbabwe. As a SADC national, your health care payments will be based on how much you earn. There are 3 income groups: H1, H2 and H3. H1: you earn less than R36 000 a year. H2: you earn less than R72 000 a year. H3: you earn more than R72 000 a year. Take the following with to hospital: ID, appointment card, payslip or proof of salary & proof of address. If you don't have the right documents, you will be placed in the H3 group. If you come from a non-SADC country you will pay more than SA citizens to access health care services."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 127
            self.add('state_127', function(name) {
                return new PaginatedState(name, {
                    text: $("Clinics provide care for adults & children. Most of the time you will not have to pay to see the doctor or get treatment. Go to the clinic closest to your home. Make an appointment first. If there's an emergency, just go. Wait for a doctor. After you've seen the doctor, the clinic will give you medicine if you need it. You don't have to pay for the medicine. If you want to go to the hospital, you need a letter from the clinic first. If there's an emergency, go straight to the hospital. Can't pay the public hospital fees? Get an affidavit from the police that states why you can't pay. You can also contact a NGO in the contact list if you can't pay your fees. They may ask the hospital to drop the fees. This is important: if you go to a private doctor or private hospital you will have to pay all the fees yourself. TIP: Feeling ill? Go to a clinic close to your house first. You will get a letter for a hospital if they can't help you."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 128
            self.add('state_128', function(name) {
                return new PaginatedState(name, {
                    text: $("Suffering through a traumatic event like abuse, violence or natural disaster can lead to post-traumatic stress disorder. Signs of post-traumatic stress disorder: struggling to sleep or concentrate, nightmares & headaches. More signs of post-traumatic stress disorder: flashbacks, anxiety, feeling helpless or scared. You should tell a professional about your experience. It's important to share your story if you have post-traumatic stress. During counselling you will talk about your experience & feelings. You can go alone, as a couple, with family or in a group. You can visit the Trauma Clinic in Johannesburg or the Trauma Centre for Survivors of Violence & Torture in Cape Town. There are other trauma clinics across SA that can also help you. Go to the contact list for more information."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 129
            self.add('state_129', function(name) {
                return new PaginatedState(name, {
                    text: $("People who don't know they have HIV can feel healthy for up to 10 years. Know your status & get treatment sooner. HIV weakens your body's power to fight off infections like pneumonia, diarrhoea, tumours & other illnesses. There isn't a cure for HIV or AIDS. Know your status, get the right treatment to help manage HIV & lead a normal life. You can get HIV doing very specific things, like having unprotected sex or using unsterilised needles & syringes. If you are HIV positive & pregnant, your baby can get HIV in the womb or when you give birth or breastfeed. TIP: You cannot get HIV through casual contact, like working together, kissing a friend, sharing the same bathroom or kitchen."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 130
            self.add('state_130', function(name) {
                return new ChoiceState(name, {
                    question: $('Select an option'),
                    choices: [
                        new Choice('state_131', $("HIV-testing")),
                        new Choice('state_132', $("PMTCT")),
                        new Choice('state_133', $("ARV treatment"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });

                // 131
                self.add('state_131', function(name) {
                    return new PaginatedState(name, {
                        text: $("To know your HIV status you need to get a blood test. You can get tested at most public health centres. The test is free. You'll receive counselling before & after your test. Sometimes two tests are done. You'll know your status after 20 minutes. Your blood sample might have to go to a laboratory. You'll only know your status in a few days. HIV tests are very accurate. Many organisations in SA offer HIV tests, counselling & treatment. Go to www.tac.org.za or the contact list for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 132
                self.add('state_132', function(name) {
                    return new PaginatedState(name, {
                        text: $("Pregnant women with HIV should ask for Nevirapine at public health centres. It can prevent HIV infection during childbirth. Nevirapine is an anti-retroviral drug (ARV). Go to the contact list or www.tac.org.za for info on centres with ARV treatments."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

                // 133
                self.add('state_133', function(name) {
                    return new PaginatedState(name, {
                        text: $("ARV treatment begins during a serious HIV-related illness or when your CD4 count drops below 350. Most people start ARV 8-10 years after infection. It isn't the same for all. See a doctor & get the best treatment for you! Remember: It doesn't matter what your document status is - you are entitled to free ARV treatment."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            // 134
            self.add('state_134', function(name) {
                return new PaginatedState(name, {
                    text: $("Rape or sexual assault victims have the right to a 28-day course of antiretrovirals (ARVs) to prevent HIV. If you choose to get treatment, you must take it within 72 hours of being assaulted. This 28-course of ARV's is for people who were HIV-negative before they were sexually assaulted.  TIP: Contact LoveLife 0800 121 900, Aids Helpline 0800 01 23 22, Aids Hotline 0800 11 06 05 for more info or help."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 066
        self.add('state_066', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_135', $("Education rights")),
                    new Choice('state_136', $("School education")),
                    new Choice('state_137', $("University education")),
                    new Choice('state_138', $("Placement in schools")),
                    new Choice('state_139', $("School fees")),
                    new Choice('state_140', $("Special needs children"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 135
            self.add('state_135', function(name) {
                return new PaginatedState(name, {
                    text: $("Everyone has the right to basic education in SA. You must have a valid study permit to study in SA. In SA on another valid permit? Check first if your permit allows you to study in SA. Some conditions might apply."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 136
            self.add('state_136', function(name) {
                return new PaginatedState(name, {
                    text: $("A creche is a preschool day-care centre for children from 1-6 years old. You have to pay a school fee. Can't pay? Ask to work in exchange for a cheaper fee. Remember: your child must have a visa and passport to be in SA. Children in SA must go to school. It's the law. Primary school is for children from 7-13 years old. Secondary school is for children from 13 to 19 years old. Secondary schools can be academic or technical. TIP: Age groups in schools are flexible. A child may be older than their school friends due to unplanned situations. TIP: In most SA government schools a student cannot be more than 2 years older than their grade's age group."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 137
            self.add('state_137', function(name) {
                return new PaginatedState(name, {
                    text: $("You can study at a university to further your education or change your education from your home country to a SA degree. A university degree can help you to get into the SA job market. Remember: You must have a valid study permit to study in SA. You can apply to study at a university or technikon. A technikon is a university of technology with more practical training. Contact the international student office at your chosen university or technikon. Ask for info about their standards."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 138
            self.add('state_138', function(name) {
                return new PaginatedState(name, {
                    text: $("Your child must have a visa & passport to be in SA. There will be conditions for your child to attend school during your stay in SA. Register for primary school at the school closest to your house. English not good? Take a friend who can help with you. Schools get full quickly. You need to apply early. Try to apply from July for entry into the school for the following year. If the school closest to your house is full, the school must show you to another school that can help you. If you struggle to register, go back to the school close to your house. They must refer you to the Dept. of Education for help. Still can't find a school for your child? Contact a social service provider for education or LHR. Go to the contact list for more info."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 139
            self.add('state_139', function(name) {
                return new PaginatedState(name, {
                    text: $("You must pay school fees. If you can't pay, you can ask for exemption. This means you can ask the school to cancel your fees. Ask for an exemption form & complete it. You need to show proof of income & give info on your expenses & responsibilities. Proof of income can be a payslip, an affidavit or letter of support. You must apply for exemption at the start of each term. Remember: keep all your letters & appointments with the school. If you ignore any notices, the school can ask you to pay. Need help filling out the exemption form? Contact a NGO in the contact list & ask for help. School uniforms & learning materials also cost money. Even if you can't afford a uniform, your child must still go to school. Second-hand school uniforms are cheaper. Ask at the school. Your child can also wear normal clothes that resemble the uniform. TIP: You shouldn't pay a registration fee at the school. The public school can't ask your child to leave if you can't pay."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 140
            self.add('state_140', function(name) {
                return new PaginatedState(name, {
                    text: $("Children with special learning needs can go to a special education school. Contact the Dept. of Education & ask about schools. Placing your child in a special education school is a long process. Get your child on a waiting list as soon as possible."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 067
        self.add('state_067', function(name) {
            return new PaginatedState(name, {
                text: $("You must be 16 years or older with a valid passport & visa. You must hand in a proof of residence. This can be a rental contract, telephone bill or utility bill in your name. You need to prove your income with a payslip or affidavit. You also need a small amount of money to put in your bank account. It may be difficult to open a bank account in SA. Most banks want to see a green SA ID before they open a bank account. Even if you have the right documents, the bank can decide if they want to give you an account or not. You can also ask a legal counsellor to help you open a bank account."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });


        // 068
        self.add('state_068', function(name) {
            return new PaginatedState(name, {
                text: $("SA's Constitution protects the rights of Lesbian, Gay, Bisexual & Transgender individuals (LGBTI). LGBTI victims of unjust treatment must go to the police. LGBTI victims of hate speech must lay a complaint with the SAHRC. Ask for legal assistance if you're struggling to lodge your claim. Go to the contact list for more info. For LGBTI support in Johannesburg: GALA 011 717 4239. In Pretoria: Out Wellbeing 012 430 3272. In Durban: Gay & Lesbian Network 033 342 6165"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });


        // 069
        self.add('state_069', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_141', $("Know your rights")),
                    new Choice('state_142', $("Report a case")),
                    new Choice('state_143', $("Get a protection order")),
                    new Choice('state_144', $("Trafficking")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 141
            self.add('state_141', function(name) {
                return new PaginatedState(name, {
                    text: $("Women & children have the right to live free from physical, verbal or sexual abuse. All types of abuse must be reported to the police. Remember: a protection order can prevent more violence. Violence can mean intimidation, physical, sexual or verbal abuse, being threatened with abuse or when you lose your freedom. Abuse can happen when men feel angry or powerless. Some men feel that women & children are their property. Some women & children accept violence or abuse. They believe violence shows love & that they can't question a man's authority. Abuse of women & children is illegal in SA. Not all abusers are men. Women can also abuse other women. Get free legal help from selected women & children's organisations or call the toll-free helpline 0800150150 for help & counselling."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 142
            self.add('state_142', function(name) {
                return new PaginatedState(name, {
                    text: $("If you or your child suffers from abuse, you must report it to the police. The police will open a criminal case. You must make a statement. You'll get a case number. An officer will investigate your case. Some police stations have special units for domestic violence, sexual offences & child protection. Go to a police station close to your home. If you don't, your case will take longer to process. You'll go for a medical examination & counseling. An officer must take you through the process."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 143
            self.add('state_143', function(name) {
                return new PaginatedState(name, {
                    text: $("If you're afraid of more violence or feel threatened, you can go to court & get a protection order. You don't need a lawyer. A protection order can order your abuser to stop abusing you, to stay away from you or force him/her out of your home. Documents like medical reports & photos of your injuries can help your abuse case. Take them with you to court. If there's enough proof of abuse, you'll get an interim protection order & suspended warrant of arrest. The police will give the protection order to your abuser. If the abuser disobeys the order, you can get him/her arrested. You'll need to go back to court a second time. Your abuser must also be there. The court will listen to your case. The court may give you a final protection order. If your abuser disobeys the order, he/she can get arrested."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 144
            self.add('state_144', function(name) {
                return new PaginatedState(name, {
                    text: $("Human trafficking happens when people are recruited & taken to another country under a false act. They're exploited & cannot leave. Trafficked victims are tricked with false promises of good jobs & better lives. Victims are forced to work under brutal & inhumane conditions. Human trafficking is a form of modern-day slavery. People who force others into trafficking are dangerous & shouldn't be confronted. Call the International Organisation for Migration (IOM) 0800 555999 or go to a police station if you know of someone who has been trafficked."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 070
        self.add('state_070', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_145', $("What is xenophobia?"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 145
            self.add('state_145', function(name) {
                return new PaginatedState(name, {
                    text: $("Xenophobia is an irrational hatred towards foreigners or an unreasonable fear or hatred of the unfamiliar persons.If you are a victim of xenophobic attacks, you must report it to the police. Go to the police station closest to your home. You must explain in detail what happened. The police will open a case. You will get a case number. Keep it safe! If you've lost your document, get an affidavit from the police that explains your situation. Go to the DHA for a new permit. If you've lost your passport, you must go to your country's embassy & then to the DHA to get a new visa."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });


        // 071
        self.add('state_071', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_146', $("Who is stateless?")),
                    new Choice('state_147', $("Birth registration")),
                    new Choice('state_148', $("South African citizenship")),
                    new Choice('state_149', $("Get legal advice"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 146
            self.add('state_146', function(name) {
                return new PaginatedState(name, {
                    text: $("A stateless person doesn't have citizenship in any country. You are also at risk of being stateless if your nationality status is undecided. Not all undocumented persons are considered stateless, e.g. when your birth isn't registered or if you don't have a birth certificate, ID or passport. An undocumented person's risk of being stateless increases when he/she belongs to a certain category or when certain factors are present. These factors include: birth outside your parents' country of nationality, death or desertion of your parent(s). Or; irregular migration across international borders, mixed nationality of your parents, loss of clinic cards or records. Or; if you're close to an international border with high cross-border movement or when the law doesn't allow you to have dual nationality."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 147
            self.add('state_147', function(name) {
                return new PaginatedState(name, {
                    text: $("A birth certificate proves your place of birth & identifies your parent/s. It's also the most important proof of your nationality. South African citizens born outside South Africa are entitled to a South African birth certificate. Foreign children born in South Africa are entitled to a birth certificate. This doesn't mean they're South African citizens. Children born in SA must be registered within 30 days. If you were born in SA, apply for late birth registration. Applications close Dec 2015."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 148
            self.add('state_148', function(name) {
                return new PaginatedState(name, {
                    text: $("You have a claim to SA citizenship if you were born in or outside SA to a parent with SA citizenship at the time of your birth. Or; if you were born in SA to a parent who was a permanent resident of SA at the time of your birth & if you lived in SA until the age of 18. Or; if you have been adopted by a South African citizen, or applied for & received a certificate of naturalisation from the DHA. Or; if you were born in SA & have no other citizenship or nationality or have no right to other citizenship or nationality."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            // 149
            self.add('state_149', function(name) {
                return new PaginatedState(name, {
                    text: $("If you struggle to register a birth or access nationality in your country of birth, contact LHR on 011-339-1960 or 012-320-2943."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        // 072
        self.add('state_072', function(name) {
            return new ChoiceState(name, {
                question: $('Select setting to change:'),
                choices: [
                    new Choice('state_165', $("Language")),
                    new Choice('state_166', $("Country")),
                    new Choice('state_167', $("Status (refugee / migrant)")),
                    new Choice('state_168', $("Back to Main Menu"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            // 165
            self.add('state_165', function(name) {
                return new ChoiceState(name, {
                    question: $('Please choose your language:'),
                    choices: [
                        new Choice('en', $("English")),
                        new Choice('fr', $("French")),
                        new Choice('am', $("Amharic")),
                        new Choice('sw', $("Swahili")),
                        new Choice('so', $("Somali")),
                    ],
                    next: function(choice) {
                        return go.utils
                            .update_language(self.im, self.contact, choice.value)
                            .then(function() {
                                return 'state_072';
                            });
                    }
                });
            });

            // 166
            self.add('state_166', function(name) {
                return new PaginatedChoiceState(name, {
                    question: $('Select your country of origin:'),
                    characters_per_page: 160,
                    options_per_page: null,
                    more: $('Next'),
                    back: $('Back'),
                    choices: [
                        new Choice('somalia', $('Somalia')),
                        new Choice('ethiopia', $('Ethiopia')),
                        new Choice('eritrea', $('Eritrea')),
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
                        return go.utils
                            .update_country(self.im, self.contact, choice.value)
                            .then(function() {
                                return 'state_072';
                            });
                    }
                });
            });

            // 167
            self.add('state_167', function(name) {
                return new ChoiceState(name, {
                    question: $('Are you a refugee or migrant?'),
                    choices: [
                        new Choice('refugee', $('I am a refugee')),
                        new Choice('migrant', $('I am a migrant'))
                    ],
                    next: function(choice) {
                        return go.utils
                            .update_status(self.im, self.contact, choice.value)
                            .then(function() {
                                return 'state_072';
                            });
                    }
                });
            });

            // 168
            self.add('state_168', function(name) {
                return new ChoiceState(name, {
                    question: $("Your new settings have been saved. Brought to you by Lawyers for Humans Rights www.lhr.org.za"),
                    choices: [
                        new Choice('state_main_menu', $("Continue"))
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
